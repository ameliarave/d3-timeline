import { States } from "./View";
import * as d3 from 'd3';
import { EdgeView } from './view/edgeview';


export function applyTransformation(view, xCoord){
  return view.lastTransform.applyX(xCoord);
}

// Converts an x-coord to a Date() obj AND transforms it to latest zoom
export function convertToDate(view, coord){
  if(!coord){return null;}
  return new Date(view.lastTransform.rescaleX(view.x).invert(coord));;
}

// Converts a date obj() to an x-coord based on original x-scale. Does not apply any transformation.
export function convertToCoord(view, date){
  if(!date){return null;}
  return view.x(date);
}

export function createArrow(view){
  const defs = view.svg.append('defs');
  const y = view.height - 200;//d3.pointer(event)[1] + 100;

  const createMarker = (id, color) => {
    defs.append('marker')
      .attr('id', id)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 5)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', color);
  };

  createMarker('arrow-start', '#fff');
  createMarker('arrow-end', '#fff');
  const line = view.svg.append('line')
  .attr('x1', view.mouseX + 12)
  .attr('y1', y)
  .attr('x2', view.mouseX + 42) // Adjust as needed
  .attr('y2', y)
  .attr('stroke', '#fff')
  .attr('stroke-width', 2)
  .attr('marker-start', 'url(#arrow-start)')
  .attr('marker-end', 'url(#arrow-end)');

  view.arrow = line;
  view.arrowBuffer = createBuffer(view, 3, view.mouseX + 5, y - 20);
  view.arrowBuffer.call(view.drag);
}

// Creates an invisible <rect> behind another element to be used for registering drags
export function createBuffer(view, id, xCord, yCord = 0){
  // Pick dimensions of dragBuffer based on id input: leftEdge, rightEdge, or arrowBuffer for 1, 2, & 3 respectively
  const x = id === 1 || id === 2 ? xCord - 25 : xCord;
  const y = yCord;
  const width = id === 1 || id === 2 ? 50 : 60;
  const height = id === 1 || id === 2 ? view.height : 40;

  const dragBuffer = view.svg.append('rect')
    .attr("x", x) // 5 pixels to the left of the line
    .attr("y", y)
    .attr("width", width) // 10 pixels width (5 on each side of the line)
    .attr("height", height)
    .attr("opacity", 0) // invisible
    .attr('id', id)
    .attr('class', 'buffer');
  dragBuffer.style('cursor', 'pointer');
  dragBuffer.call(view.drag);

  return dragBuffer;
}

export function createLine(view, id, xCord){
  const date = convertToDate(view, xCord);

  let edge = view.svg.append('line')
    .attr('x1', xCord)
    .attr('x2', xCord)
    .attr('y1', 0)
    .attr('y2', view.height)
    .attr('stroke', 'red')
    .attr('stroke-width', 1)
    .attr('class', 'vertical-line')
    .attr('id', id);  
  edge.datum({date});

  // Create invisible dragBuffer behind line
  let dragBuffer = createBuffer(view, id, xCord);

  const labelX = id === 1 ? xCord - 176 : xCord + 15;

  const label = view.svg.append("foreignObject")
    .attr('x', labelX)
    .attr('y', 280)
    .attr('width', 160)
    .attr('height', 45)

  const timeFormat = d3.timeFormat("%b %e %I:%M:%S %p")
  const dateString = timeFormat(date)

  label.append("xhtml:div")
    .attr("class", "line-label")
    .text(dateString)

  let edgeView = new EdgeView(edge, label, dragBuffer);

  if(id === 1){
    view.leftEdge = edgeView;
    view.label1 = label;
  } else {
    view.rightEdge = edgeView;
    view.label2 = label;
  }
}

export function dateToString(dateObj){
  const timeFormat = d3.timeFormat("%b %e %I:%M:%S %p")
  const dateString = timeFormat(dateObj);
  return dateString;
}

// Returns only x1 coordinate of Arrow
export function getArrow(view){
  if(!view.arrow){return null;}
  return view.arrow.attr('x1');
}

export function getLeftDate(view){
  return view.currentState.leftDate;
}

export function getLeftX(view){
  return parseFloat(view.currentState.leftX);
}

export function getRightEdge(view){
  const rightEdge = view.rightEdge ? parseFloat(view.rightEdge.line.attr('x1')) : null;
  return rightEdge;
}

export function getRightEdgeDate(view){
  return view.rightEdge.date;
}

export function getRightDate(view){
  return view.currentState.rightDate;
}

export function getRightX(view){
  return parseFloat(view.currentState.rightX);
}

// Handler for a traditional click. Triggers a reset.
export function handleClick(view){
  if(view.isPanning) {
    return; // Don't register pan as click
  } else {
    view.setIdle();
  }
}

// Handler for a "long press" click. Sets a date selection.
export function handleLongPress(view, event){
  if (event.pointerType === 'touch' && view.activeTouch > 1) {
    // It's a multi-touch event (like pinch), so don't treat it as a long press
    return;
  }
  view.mouseX = d3.pointer(event)[0];

  switch (view.currentState.state){
    case States.IDLE:
      view.setDateSelected();
      break;
    case States.DATE_SELECTED:
      // Calling setDateSelected with parameter 'flag' = 1 to indicate an update
      view.setDateSelected(1);
      break;
    case States.RANGE_SELECTED:
      // Set to Idle to clear the range before selecting a new date
      view.setIdle();
      view.setDateSelected();
      break;
  }
  view.longPress = false; // Reset this flag
}

export function handlePointerDown(view, event) {
  if(event.pointerType === 'touch'){
    view.activeTouch++;
    // If multiple active touches, user is trying to zoom or pan, so don't trigger longPress/click
    if(view.activeTouch > 1){
      return;
    }
  }
  view.initialPoint = d3.pointer(event)[0];
  view.currentPoint = view.initialPoint; // Initialize to initialPoint

  // Keeps track of the current cursor position
  const updatePoint = (event) => {
    view.currentPoint = d3.pointer(event)[0];
  };

  // Listen for any pointer movements to update cursor's currentPoint
  view.view.on("pointermove.temp", updatePoint);

  // Start a timer
  view.timer = setTimeout(() => {
    let diff = Math.abs(view.currentPoint - view.initialPoint);
    // If pointer went down and didn't move much before coming up, then its not a 'pan', its a longPress
    if (diff < 10) {
      view.handleLongPress(event);
      view.longPress = true;
    }
    // Remove the temporary "pointermove" listener
    view.view.on("pointermove.temp", null);
  }, 600);
}

export function handlePointerUp(view, event) {
  if(event.pointerType === 'touch'){
    view.activeTouch--;
    // If multiple active touches, user is trying to zoom or pan, so don't trigger longPress/click
    if(view.activeTouch > 1){
      return;
    }
  }
  // Clear the timer
  if (view.timer !== null) {
    clearTimeout(view.timer);
    view.timer = null;
  }
  // Remove the temporary "pointermove" listener & reset cursor trackers
  view.view.on("pointermove.temp", null);
  view.initialPoint = null;
  view.currentPoint = null;
}

export function initBlanket(view){
  // Ensuring that dragBuffers are created after Blanket so they are stacked on top & accessible by touch
  view.removeDragBuffers();
  if(view.currentState.state === States.DATE_SELECTED){
    const leftX = Math.min(view.currentState.leftX, view.mouseX - view.offset);
    const rightX = Math.max(view.currentState.leftX, view.mouseX - view.offset);
    view.blanket = view.svg.append("rect")
      .attr('x', leftX)
      .attr('y', 0)
      .attr('width', rightX - leftX)
      .attr('height', view.height)
      .attr('fill', 'grey')
      .attr('opacity', 0.4)
      .attr('class', "blanket");
    console.log("Blanket initialized");

    const leftBuffer = createBuffer(view, 1, view.leftEdge.x);
    const rightBuffer = createBuffer(view, 2, view.rightEdge.x);
    view.leftEdge.setDragBuffer(leftBuffer);
    view.rightEdge.setDragBuffer(rightBuffer);
  }
}

export function printState(view){
  const state = view.currentState;
  let data1 = null;
  let data2 = null;
  let data3 = null;
  let data4 = null;
  if(state.leftDate){
    data1 = state.leftDate.toLocaleString();
  }
  if(state.rightDate){
    data2 = state.rightDate.toLocaleString();
  }
  if(state.leftX){
    data3 = state.leftX;
  }
  if(state.rightX){
    data4 = state.rightX;
  }
  console.log(state.state, "leftDate: ", data1, "leftX: ", data3, "rightDate: ", data2,  "rightX: ", data4);
}

export function removeArrow(view){
  if(view.arrow && view.arrowBuffer){
    view.arrow.remove();
    view.arrow = null;
    view.arrowBuffer.remove();
    view.arrowBuffer = null;
  }
}

export function removeDragBuffers(view){
  if(view.leftEdge){
    view.leftEdge.removeDragBuffer();
  }
  if(view.rightEdge){
    view.rightEdge.removeDragBuffer();
  }
}

export function resetBlanket(view){ // Reset everything relating to blanket
  removeArrow(view);
  removeDragBuffers(view);
  if(view.blanket){
    view.blanket.remove();
    view.blanket = null;
  }
  if(view.leftEdge){
    view.leftEdge.line.remove();
    view.leftEdge = null;
  }
  if(view.rightEdge){
    view.rightEdge.line.remove();
    view.rightEdge = null;
  }
  if(view.label1){
    view.label1.remove();
    view.label1 = null;
  }
  if(view.label2){
    view.label2.remove();
    view.label2 = null;
  }
}

export function setArrow(view, xCoord){
  if(!view.arrow){return;}
  view.arrow
    .attr('x1', xCoord + 20)
    .attr('x2', xCoord + 50)
  // Two calls always go together
  setArrowBuffer(view, xCoord);
}

export function setArrowBuffer(view, xCoord){
  if(!view.arrowBuffer){return;}
  view.arrowBuffer.attr('x', xCoord - 15);
}

export function setBlanket(view, leftX, rightX){
  if(!view.blanket){return;}
  const minX = Math.min(leftX, rightX);
  const maxX = Math.max(leftX, rightX);
  view.blanket.attr('x', minX);
  view.blanket.attr('width', maxX - minX);
}

export function setEdge(view, id, xCoord){
  let edge = id === 1 || id === 2 ? view.leftEdge.line : null;
  if(!edge){return;}
  edge = id === 1 ? edge : view.rightEdge.line;
  edge
    .attr('x1', xCoord)
    .attr('x2', xCoord);
}

export function setEdgeDate(view, id, date){
  let edge = id === 1 || id === 2 ? view.leftEdge.line : null;
  if(!edge){return;}
  edge = id === 1 ? edge : view.rightEdge.line;
  edge.datum().date = date;
}

export function setLabel(view, id, xCoord){
  let label = id === 1 || id === 2 ? view.label1 : null;
  if(!label){return;}
  label = id === 1 ? label : view.label2;
  let val = id === 1 ? xCoord - 176 : xCoord + 15;
  label.attr('x', val);
}

export function setLeftX(view, leftX){
  view.currentState = {
    ...view.currentState,
    leftX: leftX
  };
}

export function setRightX(view, rightX){
  view.currentState = {
    ...view.currentState,
    rightX: rightX
  };
}

export function setState(view, state, leftX, rightX, leftDate, rightDate){
  view.currentState = {
    ...view.currentState,
    state: state,
    leftX: leftX,
    rightX: rightX,
    leftDate: leftDate,
    rightDate: rightDate
  };
}

export function setStateCoords(view, leftX, rightX){
  view.currentState = {
    ...view.currentState,
    leftX: leftX,
    rightX: rightX
  };
}

export function setupScales(view){
  // Set up SVG, scales, and axes.
  view.x = d3.scaleTime()
    .domain([view.startDate, view.endDate])
    .range([0, view.width])

  view.y = d3.scaleLinear()
    .domain([0, 600])
    .range([-1, view.height + 1])

  view.xAxis = d3.axisBottom(view.x)
    .tickSize(view.height)
    .tickPadding(8 - view.height)
    .ticks(8)

  view.yAxis = d3.axisRight(view.y)
    .ticks(10)
    .tickSize(view.width)
    .tickPadding(8 - view.width)
}

export function setupSVG(viewInst){
  // Define gradient
  const defs = viewInst.svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");

  const colorStops = [
    { offset: "0.0%", color: "#2c7bb6" },
    { offset: "12.5%", color: "#00a6ca" },
    { offset: "25.0%", color: "#00ccbc" },
    { offset: "37.5%", color: "#90eb9d" },
    { offset: "50.0%", color: "#ffff8c" },
    { offset: "62.5%", color: "#f9d057" },
    { offset: "75.0%", color: "#f29e2e" },
    { offset: "87.5%", color: "#e76818" },
    { offset: "100.0%", color: "#d7191c" }
  ];

  // Add color stops to gradient (can define these stops in the array)
  gradient.selectAll("stop")
    .data(colorStops)
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  viewInst.view = viewInst.svg.append("rect")
    .attr("class", "view")
    .attr("x", 0.5)
    .attr("y", 0.5)
    .attr("width", viewInst.width +1)
    .attr("height", viewInst.height +1)

  viewInst.gX = viewInst.svg.append("g")
    .attr("class", "axis axis--x")
    .call(viewInst.xAxis);

  viewInst.gY = viewInst.svg.append("g")
    .attr("class", "axis axis--y")
    .call(viewInst.yAxis);
}

export function setupZoom(view){
  view.zoom = d3.zoom()
    .scaleExtent([1, 100])
    .translateExtent([[-25, -25], [view.width, view.height]])
    .on("start", () => {
      zoomStart(view);
    })
    .on("zoom", (event) => {
      let d = event.transform;
      if (d.x !== 0 || d.y !== 0 || d.k !== 1) {
          view.isPanning = true; // set to true if transformation detected
      }
      zooming(view, event);
    })
    .on("end", () => {
      zoomEnd(view);
    })
}

export function setLabelDate(view, labelNum, date){
  const dateString = dateToString(date);
  const label = labelNum === 1 ? view.label1 : view.label2;
  label.select('.line-label').text(dateString);
}

export function swapEdges(view){
  let xCoord = view.id === 1 ? view.leftEdge.x : getRightEdge(view);

  let newDate = convertToDate(view, xCoord);

  // Update whichever line is being dragged
  setEdgeDate(view, view.id, newDate);

  // Aux variables for swapping
  const tempX = view.leftEdge.x;
  const tempDate = view.leftEdge.date;

  // leftEdge = rightEdge
  setEdge(view, 1, getRightEdge(view));
  setEdgeDate(view, 1, getRightEdgeDate(view));  
  view.leftEdge.dragBuffer = view.rightEdge.x;

  // rightEdge = leftEdge
  setEdge(view, 2, tempX);
  setEdgeDate(view, 2, tempDate);
  view.rightEdge.dragBuffer = tempX;

  // Keep state updated
  setState(view, view.currentState.state, view.leftEdge.x, getRightEdge(view), view.leftEdge.date, getRightEdgeDate(view));
}

export function transformBlanket(view, zoomLeft, zoomRight){
  let leftX = applyTransformation(view, zoomLeft);
  let rightX = applyTransformation(view, zoomRight);
  setBlanket(view, leftX, rightX);
}

export function transformLine(view, zoomLeft, zoomRight){
  // Transform original x-coord not the most recently transformed version, otherwise cumulative transformation => big deltas
  let leftX = applyTransformation(view, zoomLeft);
  let rightX = view.rightEdge ? applyTransformation(view, zoomRight) : null;

  if(leftX){
    setEdge(view, 1, leftX);
    view.leftEdge.dragBuffer = leftX;
    setLabel(view, 1, leftX);
    setArrow(view, leftX);
    setArrowBuffer(view, leftX);
  }
  if(rightX){
    setEdge(view, 2, rightX);
    view.rightEdge.dragBuffer = rightX;
    setLabel(view, 2, rightX);
  }
}

export function updateBlanket(view){
  if(!view.blanket){return;}
  let left, right, stationaryX, dynamicX;

  if(getRightEdge(view) === view.leftEdge.x){
    setBlanket(view, view.leftStop - 1, view.leftStop);
  } else {
    stationaryX = view.id === 1 ? getRightEdge(view) : view.leftEdge.x;
    if (view.offset){
      // blanket & edges not direct from mouseX
      if(view.mouseX >= view.leftStop + view.offset){
        dynamicX = parseFloat(view.mouseX) - view.offset;
      } else if (view.mouseX < view.leftStop - view.offset){
        dynamicX = parseFloat(view.mouseX) + view.offset;
      }
    } else {
      // blanket & edges follow mouseX directly
      dynamicX = parseFloat(view.mouseX);
    }
    left = Math.min(stationaryX, dynamicX);
    right = Math.max(stationaryX, dynamicX);
    setBlanket(view, left, right);
  }
}

let zoomLeft, zoomRight;

export function zoomStart(view){
  if(!view.leftEdge){ return; }
  view.isPanning = false

  // These are the original x-coords from before transformation to use throughout zoom event
  zoomLeft = convertToCoord(view, view.leftEdge.date);
  zoomRight = view.rightEdge ? convertToCoord(view, getRightEdgeDate(view)) : null;
}

export function zooming(view, event){
  const { transform } = event;
  view.lastTransform = transform;  // Update the last transform
  view.gX.call(view.xAxis.scale(view.lastTransform.rescaleX(view.x)));
  view.gY.call(view.yAxis.scale(view.lastTransform.rescaleY(view.y)));
  if(!view.leftEdge){ return; }

  if(view.leftEdge || view.rightEdge){
    transformLine(view, zoomLeft, zoomRight);
  }
  // Update positions of blanket edge(s)
  if (view.blanket){
    transformBlanket(view, zoomLeft, zoomRight);
  }
}

export function zoomEnd(view) {
  if(!view.leftEdge){return;}
  if(!view.isPanning){
    // handleClick
  }
  view.isPanning = false;
  // Now we can update the state to reflect new transformations
  setStateCoords(view, view.leftEdge.x, getRightEdge(view));
  printState(view);
  printEdgeStates(view);
}

export function printEdgeStates(view){
  if(view.leftEdge){
    console.log("leftEdge: x ", view.leftEdge.x, " dragBuffer ", view.leftEdge.dragBuffer, " label ", view.leftEdge.label);
  } else {
    console.log("No leftEdge");
  }
  if(view.rightEdge){
    console.log("rightEdge: x ", view.rightEdge.x, " dragBuffer ", view.rightEdge.dragBuffer, " label ", view.rightEdge.label);
  } else {
    console.log("No rightEdge");
  }
}

/*
TODO:
(2.3) What to do when edges dragged near boundaries & label is unreadable?
        => SOLUTION : Pan the timeline along with drag that would otherwise go out of frame (such that label is visible). If reaches end of date range, move label
        to inside of blanket so user can drag edge all the way up until the end of the date range

        NOTE: even with single date_selected, user can currently drag leftEdge off the end of the timeline and past end of date range => needs fixing
(2.4) Zooming on mobile while one finger is on a dragabble item....glitches
*/
