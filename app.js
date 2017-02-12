
/*********************************************************************/
/* Constants */
/*********************************************************************/

const AUDIO_ID = 'audio';
const DROPLETS_ID = 'droplets';
const INTRO_ID = 'intro';
const PLAY_BUTTON_ID = 'play-button';

const MAX_SIMULTANEOUS_CURSORS = 4;

const TICK_INTERVAL = 10;
const PLAY_BUTTON_ANIMATION_DURATION = 1500; // in milliseconds; should be equivalent to duration of fade-out css transition;
const INITIAL_ANIMATION_DELAY_DURATION = 950;
const MOVE_CURSOR_INTERVAL = 1686 / TICK_INTERVAL;
const SPAWN_CURSOR_INTERVAL = MOVE_CURSOR_INTERVAL * 3;
const DROPLET_ANIMATION_DURATION = 5000; // in milliseconds; should be equivalent to duration of fade-out css animation

const COLORS = [
  '#251db4', // persian blue
  '#1ecfd6', // java
  '#118c8b', // blue chill
  '#ffcc33', // sunglow
  '#560764', // clairvoyant
  '#f71b78', // rose
  '#ba0000', // guardsman red
  '#8b81e2', // medium purple
];


/*********************************************************************/
/* Global Variables */
/*********************************************************************/

let columnCount, cursors, playing = false, rowCount, tickInterval, time;


/*********************************************************************/
/* Helpers */
/*********************************************************************/

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomColor() {
  return COLORS[getRandomInt(0, COLORS.length - 1)];
}

function getRandomEdgeCellAndVelocities() {
  switch(getRandomInt(0, 3)) {
    case 0: // Top
      return [0, getRandomInt(0, columnCount - 1), 0, 1];
    case 1: // Right
      return [getRandomInt(0, rowCount - 1), columnCount - 1, -1, 0];
    case 2: // Bottom
      return [rowCount - 1, getRandomInt(0, columnCount - 1), 0, -1];
    case 3: // Left
      return [getRandomInt(0, rowCount - 1), 0, 1, 0];
  }
  return [getRandomInt(0, rowCount - 1), getRandomInt(0, columnCount - 1)];
}

function isCellOccupied(row, column) {
  return !!cursors.find(function(cursor) {
    return cursor.row === row && cursor.column === column;
  });
}

function getCellEl(row, column) {
  return document.getElementById('cell-' + row + '-' + column);
}


/*********************************************************************/
/* Main */
/*********************************************************************/

function calculateGridMeasurements() {
  // Column Count
  if (document.body.clientWidth <= 320) columnCount = 4;
  else if (document.body.clientWidth <= 481) columnCount = 5;
  else if (document.body.clientWidth <= 768) columnCount = 6;
  else if (document.body.clientWidth <= 1024) columnCount = 8;
  else if (document.body.clientWidth <= 1281) columnCount = 10;
  else columnCount = 12;

  // Row Count
  if (document.body.clientHeight <= 300) rowCount = 4;
  else if (document.body.clientHeight <= 400) rowCount = 5;
  else if (document.body.clientHeight <= 500) rowCount = 6;
  else if (document.body.clientHeight <= 600) rowCount = 7;
  else if (document.body.clientHeight <= 700) rowCount = 8;
  else if (document.body.clientHeight <= 800) rowCount = 9;
  else rowCount = 10;
}

function drawGrid() {
  calculateGridMeasurements()
  let i, j, html = '';
  for (i = 0; i < rowCount; i++) {
    html += '<div class="row" id="row-' + i + '">';
    for (j = 0; j < columnCount; j++) {
      html += '<div class="cell" id="cell-' + i + '-' + j + '"></div>';
    }
    html += '</div>';
  }
  document.getElementById(DROPLETS_ID).innerHTML = html;
}

function resetAnimation() {
  time = -1;
  cursors = [];
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(onTick, TICK_INTERVAL);
}

function drawDroplet(cursor) {
  let xVelClass, yVelClass, dropletEl = document.createElement('div');
  if (cursor.xVel < 0) xVelClass = 'left';
  else if (cursor.xVel > 0) xVelClass = 'right';
  if (cursor.yVel < 0) yVelClass = 'up';
  else if (cursor.yVel > 0) yVelClass = 'down';

  dropletEl.className = 'droplet ' + (xVelClass || '') + ' ' + (yVelClass || '');
  dropletEl.style['background-color'] = getRandomColor();
  dropletEl.style['z-index'] = time;
  setTimeout(function() {
    dropletEl.remove();
  }, DROPLET_ANIMATION_DURATION);
  return getCellEl(cursor.row, cursor.column).appendChild(dropletEl);
}

function spawnCursor() {
  let column, cursor, moveInterval, row, xVel, yVel;
  do {
    [row, column, xVel, yVel] = getRandomEdgeCellAndVelocities();
  } while(isCellOccupied(row, column));
  cursor = {
    column,
    row,
    ticksUntilNextMove: MOVE_CURSOR_INTERVAL,
    xVel,
    yVel,
  };
  drawDroplet(cursor);
  cursors.push(cursor);
}

function moveCursor(cursor) {
  let row, column;
  const potentialDestinations = [
    [ cursor.row - 1, cursor.column ], // up
    [ cursor.row, cursor.column + 1 ], // right
    [ cursor.row + 1, cursor.column ], // down
    [ cursor.row, cursor.column - 1 ] // left
  ];

  function getDestination() {
    const destinationIndex = getRandomInt(0, 6);
    if (destinationIndex >= 4) {
      // Cheap way to get a "weighted average", favoring current momentum
      return [cursor.row + cursor.yVel, cursor.column + cursor.xVel];
    } else {
      return potentialDestinations[destinationIndex];
    }
  }

  function isDestinationOppositeCurrentMomentum(row, column) {
    return column - cursor.column === -cursor.xVel &&
      row - cursor.row === -cursor.yVel;
  }

  do {
    [row, column] = getDestination();
  } while(isDestinationOppositeCurrentMomentum(row, column));

  cursor.xVel = column - cursor.column;
  cursor.yVel = row - cursor.row;
  [cursor.row, cursor.column] = [row, column];

  if (cursor.row < 0 || cursor.row >= rowCount || cursor.column < 0 || cursor.column >= columnCount) {
    cursors.splice(cursors.indexOf(cursor), 1);
  } else {
    drawDroplet(cursor);
    cursor.ticksUntilNextMove = MOVE_CURSOR_INTERVAL;
  }
}

function onTick() {
  if (++time === Number.MAX_SAFE_INTEGER) {
    time = 0;
  }
  if (time % SPAWN_CURSOR_INTERVAL === 0 && cursors.length < MAX_SIMULTANEOUS_CURSORS) {
    spawnCursor();
  }
  cursors.forEach(function(cursor) {
    if (--cursor.ticksUntilNextMove === 0) {
      moveCursor(cursor);
    }
  });
}

function onPlayClick() {
  playing = true;
  document.getElementById(AUDIO_ID).play();
  document.body.className += ' playing';
  setTimeout(resetAnimation, INITIAL_ANIMATION_DELAY_DURATION);
  document.getElementById(PLAY_BUTTON_ID).removeEventListener('click', onPlayClick);
  setTimeout(function() {
    document.getElementById(INTRO_ID).remove();
  }, PLAY_BUTTON_ANIMATION_DURATION);
}

function onResize() {
  drawGrid();
  if (playing) {
    resetAnimation();
  }
}

function init() {
  drawGrid();
  document.getElementById(PLAY_BUTTON_ID).addEventListener('click', onPlayClick);
  window.addEventListener('resize', onResize);
  document.removeEventListener('DOMContentLoaded', init);
}

document.addEventListener('DOMContentLoaded', init);
