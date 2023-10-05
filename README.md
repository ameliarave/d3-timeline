# d3-timeline
A project that uses d3 to implement custom interactions within a timeline to be used for viewing the number of edits occurring at specific dates and times. 

[View demo here:](https://jsfiddle.net/mimirave/bnaf9cyh/511/)

<strong>To run locally:</strong>
* Download zip of code
* Store in same directory
* Launch HTML file in browser
* _Optional:_ Make edits to <code>main.js</code> to change range of dates and/or dimensions of timeline
* _Note:_ You can view and edit immediately in JSFiddle by clicking the demo link above

<strong>Usage:</strong>
* Zoom using mousewheel or pinch
* Pan using click-and-drag or swipe
* Click-and-hold (long press) to select a date/time [line appears]
* Click-and-drag the anchor/line that you just created to reposition it before checking the "compare" box
* Single-click on background to remove anchor/line
* Check the "Compare" checkbox (appears with anchor/line) to place your second anchor/line
* Click inside of the grey 'blanket' area to view tooltip message displaying exact date/time of selection
* Single-click outside of greyed-out 'blanket' to remove it
* _Note:_ You can zoom and pan with anchor or blanket showing and these elements will remain pinned and will rescale
