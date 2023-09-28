document.addEventListener("DOMContentLoaded", function() {
  
  const width = 960;
  const height = 500;
  const container = d3.select("#container");  
  const svgElement = container.append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const startDate = new Date(2023, 5, 12, 10, 15); // year, month (0-indexed), day, hour (00:00-23:59), minute
  const endDate = new Date(2023, 6, 14, 16, 30);
  const view = new View(startDate, endDate, svgElement);
  
});
