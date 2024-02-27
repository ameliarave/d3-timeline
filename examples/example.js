import { View } from '../src/View';
import * as d3 from 'd3';

document.addEventListener("DOMContentLoaded", function() {
  // TODO: container resizes should trigger a redraw
  const container = d3.select("#container");
  const width =  container.clientWidth;
  const height = container.clientHeight;
  const svg = container.append("svg")
    .attr("viewBox", [0, 0, width, height]) // width and height hardcoded her
    .attr("width", '100%')
    .attr("height", '400px')

  const start = new Date(2023, 5, 12, 10, 15); // year, month (0-indexed), day, hour (00:00-23:59), minute
  const end = new Date(2023, 6, 14, 16, 30);
  const view = new View(start, end, svg);

  // TODO: add the ability to set a graph with a time series x-axis
  // if it's null, just have a white background, if it's a graph it should display
  // and work with the drag/zoom.
  //
  // ideal interface
  // const graph = null
  // view.setGraph(graph)

  document.getElementById('resetButton').addEventListener('click', () => {
    view.reset()
  });
});
