export class EdgeView {
  // id, date

  line = null // d3 line
  dragBuffer = null // d3 rect draggable area
  label = null // d3 foreign object <html> label for the edge
  _highlighted = false


  constructor(line) {
    this.line = line
    this.highlighted = false
    line.attr("stroke", "red");
  }

  get x() {
    return parseFloat(this.line.attr('x1'));
  }

  get date() {
    return this.line.datum().date
  }

  set highlighted(value) {
    this.line.attr('stroke-width', value ? 4 : 1);
    this._highlighted = value
  }

  get highlighted() {
    return this._highlighted
  }


}
