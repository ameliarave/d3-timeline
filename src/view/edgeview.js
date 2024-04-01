export class EdgeView {
  // id, date

  line = null; // d3 line
  _dragBuffer = null; // d3 rect draggable area
  _label = null; // d3 foreign object <html> label for the edge
  _highlighted = false;


  constructor(line, label, dragBuffer) {
    this.line = line;
    this._label = label;
    this._dragBuffer = dragBuffer;
    this._highlighted = false;
    line.attr("stroke", "red");
  } 

  removeDragBuffer(){
    this._dragBuffer.remove();
    this._dragBuffer = null;
  }

  // Syntax: leftEdge.setDragBuffer(newDragBuffer)
  // The above assigns an entirely new object
  setDragBuffer(newDragBuffer){
    this._dragBuffer = newDragBuffer;
  }

  get x() {
    return parseFloat(this.line.attr('x1'));
  }

  get date() {
    return this.line.datum().date;
  }

  get highlighted() {
    return this._highlighted;
  }

  // Syntax: console.log(leftEdge.dragBuffer);
  get dragBuffer(){
    return parseFloat(this._dragBuffer.attr('x'));
  }

  get label(){
    return parseFloat(this._label.attr('x'));
  }

  get line(){
    return this._label.attr('x');
  }

  set highlighted(value) {
    this.line.attr('stroke-width', value ? 4 : 1);
    this._highlighted = value;
  }

  // Syntax: leftEdge.dragBuffer = xCoord
  // The above executes the below function
  set dragBuffer(xCoord){
    this._dragBuffer.attr('x', xCoord - 25);
  }

  set label(xCoord){
    this._label.attr('x', xCoord);
    // Update later to change text/date for label
  }

  


}
