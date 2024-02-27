# d3-timeline
A project that uses d3 to implement custom interactions within a timeline to be used for viewing the number of edits occurring at specific dates and times. 

<strong>To run locally:</strong>
* Download zip of code
* Open project directory in an IDE like VSCode
* Open a terminal and run <code>npm install</code>
* Run <code>npm run start-example</code>
* Look at npm output to see where to view the app i.e. localhost:8081
* _Optional:_ Make edits to <code>examples/example.js</code> to change range of dates and/or dimensions of timeline

<strong>Usage:</strong>
* Zoom using mousewheel or pinch
* Pan using click-and-drag or swipe
* Click-and-hold (long press) to select a date/time [line appears]
* Click-and-drag the anchor/line that you just created to reposition it
* Single-click on background to remove anchor/line
* To select a range click and drag the white arrow
* To adjust the range, click and drag either red lines
* Single-click outside of selected range to clear it
* _Note:_ You can zoom and pan with selections showing and these elements will rescale
