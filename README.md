#TS Super Cardboard

An iteration task board with several features:

* Allows for custom task states that can be mapped to Task states (much like Kanban)
* Add new items and change items on the board
* Filter by user
** If a task/child defect belongs to the filtered user, show
** If a scheduled story/defect belongs to the filtered user, show it and all of its tasks/child defects

* When a story is set to accepted, it goes to the rightmost column and the tasks disappear.
* **CAUTION**: when choosing a field for the columns that allows a null value, if you choose NOT to display the
empty column, then any tasks/defects that have no value in that column *will be changed to have the first column's
value*.

## Development Notes

* An example of a field combobox that has fields in an array of models
* An example of drag and drop inside of a grid

### Screenshot(s)
![Super Task Board](https://raw.github.com/RallyRonnie/super-task-board/master/screenshot.png)
