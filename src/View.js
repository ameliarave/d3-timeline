import * as d3 from "d3";
import * as util from "./utility";

export const States = Object.freeze({
  IDLE: 'idle',
  DATE_SELECTED: 'date selected',
  RANGE_SELECTED: 'range selected'
})

export class View {

  // FIXME: why aren't getters working
  // get width() {
  //   this.svg.node().width.baseVal.value;
  // }

  // get height() {
  //   this.svg.node().height.baseVal.value;
  // }

  constructor(startDate, endDate, svgElement) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.svg = svgElement;
    this.width =  this.svg.node().width.baseVal.value;
    this.height = this.svg.node().height.baseVal.value;

    this.arrow = null;
    this.arrowBuffer = null;
    this.activeTouch = 0; // counter to determine how many active touches on mobile screen. Used to avoid undesired click triggers
    this.blanket = null; // d3 <rect> element that highlights the area selected between two datetimes
    this.dragBuffer1 = null; // hidden d3 <rect> element with d3 drag behavior attached for dragging date selection lines
    this.dragBuffer2 = null; // hidden d3 <rect> element with d3 drag behavior attached for dragging date selection lines
    this.leftEdge = null;  // d3 <line> element that represents a selected date
    this.offset = null;
    this.rightEdge= null;   // d3 <line> element that represents a selected date
    this.timer = null; // reference to setTimeout in pointerDown and pointerUp handlers - differentiate longPress / click
    this.id = null;   // id is either 1 or 2 in regard to leftEdge & rightEdge. Used to determine which <line> to modify
    this.isDragging = false; // flag to avoid pointerUp handler executing at termination of a drag
    this.isPanning = false; // flag used to differentiate between click and pans/zooms
    this.label1 = null; // div displaying datetime of line 1 selection
    this.label2 = null; // div displaying datetime of line 2 selection
    this.lastTransform = d3.zoomIdentity; // holds details x,y,k of most recent d3 zoom transformation. Used to transform other elements/dates
    this.longPress = false; // flag used in pointerUp listener to correctly trigger handleClick function
    this.logNum = 0; // DEBUG purposes for custom logging
    this.mouseX = null; // holds most recent/current x-coordinate of the mouse or touch interaction

    // Define initial state
    this.currentState = {
      state: States.IDLE,
      leftDate: null, // Date() Object
      rightDate: null, // Date() Object
      leftX: null, // mouse coordinate
      rightX: null // mouse coordinate
    }

    // Declare x and y scales, axis, etc
    util.setupScales(this);
    util.setupSVG(this);
    util.setupZoom(this);

    // Define d3 drag behavior
    this.drag = d3.drag()
      .on("start", this.dragStart.bind(this))
      .on("drag", this.dragging.bind(this))
      .on("end", this.dragEnd.bind(this));

    // Envoke d3 zoom behavior
    this.svg.call(this.zoom);
    // Disable default double-click behavior so mobile devices don't register longPress as double-click
    this.svg.on("dblclick.zoom", null);

    this.view.on("pointerdown", (event) => {
      this.longPress = false;
      this.handlePointerDown(event);
    });

    this.view.on("pointerup", (event) => {
      if(this.isDragging) { return; } // Don't handle pointerup event if dragging
      if(!this.longPress && !this.isPanning){  // Regular click
        this.handleClick();
      }
      this.handlePointerUp(event);
    });


    // Disable default context menu to prevent IOS from triggering its date selection functionality (i.e. add to calendar)
    this.svg.on("contextmenu", event => {
      event.preventDefault();
    });
  }

  reset() {
    this.resetZoom();
    this.setIdle();
  }

// ================================================================================================================================== //
// ======================================================VVVV DRAG HANDLERS VVVV==================================================== //
// ================================================================================================================================== //

  // Handler that is triggered once every time d3 drag behavior is triggered
  // Tracks which element has been selected for dragging and behaves conditionally based on this
  dragStart(event) {
    let coord;
    // Retrieve the coordinates of this event
    if(event.sourceEvent.touches){
      coord = d3.pointer(event.sourceEvent.changedTouches[0]);
    } else {
      coord = d3.pointer(event);
    }

    // We only want the x-coordinate
    this.mouseX = coord[0];
    this.isDragging = true;
    this.activeTouch++;
    const target = d3.select(event.sourceEvent.target);

    // If target is either end of the arrow, id == 3 , else get id == 1 or id == 2 based on which edge selected
    this.id = target === 'arrow-start' || target === 'arrow-end' ? 3 : Number(target.attr('id'));

    // If dragging the arrow, we create a range selection
    if(this.id === 3){
      if(this.currentState.state === States.DATE_SELECTED){ // State: DATE_SELECTED -> RANGE_SELECTED
        // rightEdge does not exist yet, so we create it
        this.offset = parseFloat(this.mouseX) - this.leftEdge.x;
        // leftStop helps us in calculations for visual behavior of edges crossing over one another during range selection
        this.leftStop = this.leftEdge.x;
        util.createLine(this, 2, this.leftEdge.x);
        this.initBlanket();
      }
    }

    // If id == 3, we are dragging edge2 using arrow, so change id to 2 for logic in dragging() & dragEnd()
    if(this.id === 3){this.id = 2;}
    let edge = this.id === 1 ? this.leftEdge : this.rightEdge;

    edge.highlighted = true;
    // Animate arrow to prompt user to drag it
    if(this.arrow){
      this.arrow
      .transition()
      .duration(10)
      .attr('transform', 'translate(-30, -30) scale(1.08)');
    }
  }

  // Handler for each movement inbetween dragStart and dragEnd. Usually called many times.
  // Tracks cursor locations and updates visual elements accordingly
  dragging(event) { // During drag
    let coord;
    if(event.sourceEvent.touches){ // Checking for the existence of a 'touchesList' indicating a touch screen input
      coord = d3.pointer(event.sourceEvent.touches[0]); // 'touches' is a touchList of all objects that are currently
                                                        // in contact with screen and hagve not yet been released
      coord = d3.pointer(event.sourceEvent.changedTouches[0]);  // changedTouches contains points of contact whose states changed between touchstart, move, & touchend
    } else {
      coord = d3.pointer(event);
    }
    this.mouseX = coord[0]; // Current mouse position via touch or mouse

    // Dragging rightEdge across leftEdge...
    // When cursor is far enough away from 'leftStop' start moving leftEdge again
    //   =>  IF (mouseX < (leftStop - offset)) THEN leftEdge = (mouseX + offset)
    //
    // Dragging leftEdge across rightEdge...
    // When cursor is far enough away from 'leftStop', start moving rightEdge again
    //   => IF (mouseX >= /(leftStop + offset) THEN rightEdge = [ mouseX - offset ]
    //
    // When cursor is NOT far enough away from 'leftStop' THEN leftEdge or rightEdge = leftStop
    let target, arrowTarget;
    if(this.offset){  // offset variable only set if we are dragging arrow to create an initial range
      if(this.mouseX >= this.leftStop + this.offset){
        target = this.mouseX - this.offset;
        arrowTarget = target - 8;

      } else if(this.mouseX < this.leftStop - this.offset){
        target = this.mouseX + this.offset;
        arrowTarget = this.mouseX - 60;
      } else {
        target = this.leftStop;
        arrowTarget = this.mouseX - 60;
      }
    } else {
      target = this.mouseX;
      arrowTarget = target;
    }

    this.setEdge(this.id, target);
    this.setDragBuffer(this.id, target);

    // Maintain the invariant that leftEdge <= rightEdge. Check if they need to be swapped.
    if (this.rightEdge && this.leftEdge.x > this.getRightEdge() ){
      // Swap everything concerning edges
      this.swapEdges();

      // Swap label coordinates relative to respective edges
      this.setLabel(1, this.leftEdge.x);
      this.setLabel(2, this.getRightEdge());

      // Swap label dates respectively
      this.setLabelDate(1, this.convertToDate(this.leftEdge.x));
      this.setLabelDate(2, this.convertToDate(this.getRightEdge()));

      // Swap highlighted line
      let line = this.id === 1 ? this.leftEdge : this.rightEdge;
      line.highlighted = false;

      // Must swap id for edge being dragged
      this.id = this.id === 1 ? 2 : 1;

      // Finish swapping highlighted line
      line = this.id === 1 ? this.leftEdge : this.rightEdge;
      line.highlighted = true;

    } else {
      // Label follow drag
      this.setLabel(this.id, target);

      // Update label text to display datetime of new position
      const labelNum = this.id === 1 ? 1 : 2;
      this.setLabelDate(labelNum, this.convertToDate(target));
    }

    // Update dragged edge's internal date
    this.setEdgeDate(this.id, this.convertToDate(target));

    // Move arrow & its buffer along with drag if it exists (checks in setArrow)
    this.setArrow(arrowTarget);

    // Blanket changes size with drag
    this.updateBlanket();
  }

  // Handler for the end of of a drag event / release of cursor
  // Updates state based on the changes that visual elements underwent in dragging()
  // Resets id, isDragging, and offset for use in next drag event
  dragEnd(event) {
    let coord;
    if(event.sourceEvent.touches){
      coord = d3.pointer(event.sourceEvent.changedTouches[0]);
    } else {
      coord = d3.pointer(event);
    }
    this.mouseX = coord[0];
    this.activeTouch--;

    const line = this.id === 1 ? this.leftEdge : this.rightEdge;
    // Revert the line to its original appearance
    line.highlighted = false;

    switch(this.currentState.state){
      case States.DATE_SELECTED:
        if(this.rightEdge){
          // User draged rightEdge into position to select an initial range
          this.setRangeSelected();
        } else {
          // User dragged leftEdge (rightEdge doesn't exist) to a new position
          this.setDateSelected();
         // this.updateDateSelected();
        }
        break;
      case States.RANGE_SELECTED:
        // Range was already set and we dragged an edge, update edges in setRangeSelected()
        this.setRangeSelected();
        break;
    }

    // Reposition arrow to the right of leftEdge/rightEdge
    if(this.arrow){
      this.arrow
      .transition()
      .duration(10)
      .attr('transform', '');
    }

    // reset global id var for next drag event
    this.id = null;
    this.isDragging = false;
    this.offset = null;
  }

// ================================================================================================================================== //
// ======================================================VVVV STATE SETTERS VVVV==================================================== //
// ================================================================================================================================== //

  // Removes all current elements from previous state & sets state to idle
  setIdle(){
    this.resetBlanket();
    this.setState(States.IDLE, null, null, null, null);
    this.printState();
  }

  // Handles the selection of a single date associated with a single vertical line.
  // Envoked in handleLongPress() & dragEnd().
  // Parameter 'flag' tells us if we need to also set Label, Arrow, & dragBuffer or not
  setDateSelected(flag = null){
    const date = this.convertToDate(this.mouseX);
    if(this.currentState.state === States.IDLE){ // IDLE => DATE_SELECTED
      this.createLineOne();
      this.createArrow();
    } else if (this.currentState.state === States.DATE_SELECTED){
      if(!flag){  // Envoked by dragEnd()
        // Other elements were already updated in dragging()
        this.setEdgeDate(1, date);
        // Revert the line to its original appearance
        this.leftEdge.highlighted = false;
      } else {  // Envoked by longPress
        this.setEdge(1, this.mouseX);
        this.setEdgeDate(1, date);
        this.setDragBuffer(1, this.mouseX);
        this.setLabel(1, this.mouseX);
        this.setLabelDate(1, date);
        this.setArrow(this.mouseX);
      }
    }
    this.setState(States.DATE_SELECTED, this.leftEdge.x, null, this.leftEdge.date, null);
    this.printState();
  }

  // Handles the selection of a range between two dates associated with two vertical lines and a grey <rect> ('blanket')
  // Envoked in dragEnd() for both initial range and updating the current range
  setRangeSelected(){
    const leftX = this.leftEdge.x;
    const rightX = this.getRightEdge();
    const leftDate = this.convertToDate(leftX);
    const rightDate = this.convertToDate(rightX);

    this.setEdgeDate(1, leftDate);
    this.setEdgeDate(2, rightDate);
    this.setState(States.RANGE_SELECTED, leftX, rightX, leftDate, rightDate);

    this.dragBuffer1.call(this.drag); // TODO move to one call in util.createLine()
    this.dragBuffer2.call(this.drag); // TODO ISSUE: single call in createLine()

    this.removeArrow();
    this.printState();
  }

// ================================================================================================================================== //
// =========================================================VVVV UTILITIES VVVV====================================================== //
// ================================================================================================================================== //

  convertToDate(coord){
    return util.convertToDate(this, coord);
  }

  createArrow(){
    util.createArrow(this);
  }

  createLineOne(){
    util.createLine(this, 1, this.mouseX);
  }

  customLog(message) {
    const logDiv = document.getElementById('logOutput');
    //const currentTime = new Date().toLocaleTimeString(); // Adds a timestamp
    logDiv.innerHTML += `<p>[${this.logNum}]   ${message}</p>`;
    logDiv.scrollTop = logDiv.scrollHeight; // Auto-scroll to the latest log
    this.logNum++;
  }

  dateToString(dateObj){
    return util.dateToString(dateObj);
  }

  getArrow(){
    return util.getArrow(this);
  }

  getLeftDate(){
    return util.getLeftDate(this);
  }

  getLeftX(){
    return util.getLeftX(this);
  }

  getRightEdge(){
    return util.getRightEdge(this);
  }

  getRightEdgeDate(){
    return util.getRightEdgeDate(this);
  }

  getRightDate(){
    return util.getRightDate(this);
  }

  getRightX(){
    return util.getRightX(this);
  }

  handleClick(){
    util.handleClick(this);
  }

  handleLongPress(event){
    util.handleLongPress(this, event);
  }

  handlePointerDown(event){
    util.handlePointerDown(this, event);
  }

  handlePointerUp(event){
    util.handlePointerUp(this, event);
  }

  initBlanket(){
    util.initBlanket(this);
  }

  printState(){
    util.printState(this);
  }

  removeArrow(){
    util.removeArrow(this);
  }

  removeDragBuffers(){
    util.removeDragBuffers(this);
  }

  resetBlanket() {
    util.resetBlanket(this)
  }

  resetZoom() {
    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity);
  }

  setArrow(xCoord){
    util.setArrow(this, xCoord);
  }

  setArrowBuffer(xCoord){
    util.setArrowBuffer(this, xCoord);
  }

  setBlanket(leftX, rightX){
    util.setBlanket(this, leftX, rightX);
  }

  setDragBuffer(id, xCoord){
    util.setDragBuffer(this, id, xCoord);
  }

  setEdge(id, xCoord){
    util.setEdge(this, id, xCoord);
  }

  setEdgeDate(id, date){
    util.setEdgeDate(this, id, date);
  }

  setLabel(id, xCoord){
    util.setLabel(this, id, xCoord);
  }

  setLabelDate(labelNum, date){
    util.setLabelDate(this, labelNum, date);
  }

  setLeftX(leftX){
    util.setLeftX(this, leftX);
  }

  setRightX(rightX){
    util.setRightX(this, rightX);
  }

  setState(state, leftX, rightX, leftDate, rightDate){
    util.setState(this, state, leftX, rightX, leftDate, rightDate);
  }

  setStateCoord(leftX, rightX){
    util.setStateCoords(this, leftX, rightX);
  }

  swapEdges(){
    util.swapEdges(this);
  }

  transformBlanket(){
    util.transformBlanket(this);
  }

  transformLine(){
    util.transformLine(this)
  }

  updateBlanket() {
    util.updateBlanket(this);
  }
} // End View
