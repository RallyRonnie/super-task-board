/**
 *
 * Note that the plugin must be added to the grid view, not to the grid panel. For example, using {@link Ext.panel.Table viewConfig}:
 *
 *      viewConfig: {
 *          plugins: {
 *              ptype: 'tscelldragdrop',
 *          }
 *      }
 */
Ext.define('Rally.technicalservices.TSCellDragDrop', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.tscelldragdrop',

    uses: ['Ext.view.DragZone',
        'Ext.grid.ViewDropZone'],

    /**
     * @cfg {Boolean} enforceType
     * Set to `true` to only allow drops of the same type.
     *
     * Defaults to `false`.
     */
    enforceType: false,

    /**
     * @cfg {Boolean} applyEmptyText
     * If `true`, then use the value of {@link #emptyText} to replace the drag record's value after a node drop.
     * Note that, if dropped on a cell of a different type, it will convert the default text according to its own conversion rules.
     *
     * Defaults to `false`.
     */
    applyEmptyText: false,

    /**
     * @cfg {Boolean} emptyText
     * If {@link #applyEmptyText} is `true`, then this value as the drag record's value after a node drop.
     *
     * Defaults to an empty string.
     */
    emptyText: '',

    /**
     * @cfg {Boolean} dropBackgroundColor
     * The default background color for when a drop is allowed.
     *
     * Defaults to green.
     */
    dropBackgroundColor: '#C0D9AF',
    
    dropLineColor: 'green',

    /**
     * @cfg {Boolean} noDropBackgroundColor
     * The default background color for when a drop is not allowed.
     *
     * Defaults to red.
     */
    noDropBackgroundColor: '#FFBAD2',

    //<locale>
    /**
     * @cfg {String} dragText
     * The text to show while dragging.
     *
     * Two placeholders can be used in the text:
     *
     * - `{0}` The number of selected items.
     * - `{1}` 's' when more than 1 items (only useful for English).
     */
    dragText: '{0} selected row{1}',
    //</locale>

    /**
     * @cfg {String} ddGroup
     * A named drag drop group to which this object belongs. If a group is specified, then both the DragZones and
     * DropZone used by this plugin will only interact with other drag drop objects in the same group.
     */
    ddGroup: "GridDD",

    /**
     * @cfg {Boolean} enableDrop
     * Set to `false` to disallow the View from accepting drop gestures.
     */
    enableDrop: true,

    /**
     * @cfg {Boolean} enableDrag
     * Set to `false` to disallow dragging items from the View.
     */
    enableDrag: true,

    /**
     * @cfg {Object/Boolean} containerScroll
     * True to register this container with the Scrollmanager for auto scrolling during drag operations.
     * A {@link Ext.dd.ScrollManager} configuration may also be passed.
     */
    containerScroll: false,

    init: function (view) {
        var me = this;

        view.on('render', me.onViewRender, me, {
            single: true
        });
    },

    destroy: function () {
        var me = this;

        Ext.destroy(me.dragZone, me.dropZone);
    },

    enable: function () {
        var me = this;

        if (me.dragZone) {
            me.dragZone.unlock();
        }
        if (me.dropZone) {
            me.dropZone.unlock();
        }
        me.callParent();
    },

    disable: function () {
        var me = this;

        if (me.dragZone) {
            me.dragZone.lock();
        }
        if (me.dropZone) {
            me.dropZone.lock();
        }
        me.callParent();
    },

    onViewRender: function (view) {
        var me = this,
            scrollEl;

        if (me.enableDrag) {
            if (me.containerScroll) {
                scrollEl = view.getEl();
            }

            me.dragZone = new Ext.view.DragZone({
                view: view,
                ddGroup: me.dragGroup || me.ddGroup,
                dragText: me.dragText,
                containerScroll: me.containerScroll,
                scrollEl: scrollEl,
                getDragData: function (e) {
                    
                    var view = this.view,
                        item = e.getTarget(view.getItemSelector()),
                        record = view.getRecord(item),
                        task = me._getTaskFromRecord(e.target.id, view.getRecord(item)),
                        cell = e.getTarget(view.getCellSelector()),
                        dragEl, header;

                    if (item) {
                        dragEl = document.createElement('div');
                        dragEl.className = 'x-form-text';
                        dragEl.appendChild(document.createTextNode(cell.textContent || cell.innerText));

                        header = view.getHeaderByCell(cell);
                        return {
                            event: new Ext.EventObjectImpl(e),
                            ddel: dragEl,
                            item: e.target,
                            columnName: header.dataIndex,
                            record: record,
                            task: task
                        };
                    }
                },

                onInitDrag: function (x, y) {
                    var self = this,
                        data = self.dragData,
                        view = self.view,
                        selectionModel = view.getSelectionModel(),
                        record = data.record,
                        el = data.ddel;

                    // Update the selection to match what would have been selected if the user had
                    // done a full click on the target node rather than starting a drag from it.
                    if (!selectionModel.isSelected(record)) {
                        selectionModel.select(record, true);
                    }

                    Ext.fly(self.ddel).update(el.textContent || el.innerText);
                    //self.proxy.update(self.ddel);
                    self.onStartDrag(x, y);
                    return true;
                }
            });
        }

        if (me.enableDrop) {
            me.dropZone = new Ext.dd.DropZone(view.el, {
                view: view,
                ddGroup: me.dropGroup || me.ddGroup,
                containerScroll: true,

                getTargetFromEvent: function (e) {
                    var self = this,
                        view = self.view,
                        cell = e.getTarget(view.cellSelector),
                        row, header;

                    // Ascertain whether the mousemove is within a grid cell.
                    if (cell) {
                        row = view.findItemByChild(cell);
                        header = view.getHeaderByCell(cell);

                        if (row && header) {
                            return {
                                node: cell,
                                record: view.getRecord(row),
                                columnName: header.dataIndex
                            };
                        }
                    }
                },

                // On Node enter, see if it is valid for us to drop the field on that type of column.
                onNodeEnter: function (target, dd, e, dragData) {
                    var self = this,
                        destRecordID = target.record.get('__WorkProduct').get('ObjectID'),
                        sourceRecordID = dragData.record.get('__WorkProduct').get('ObjectID'),
                        task = dragData.task,
                        view = self.view,
                        store = view.getStore();

                    delete self.dropOK;

                    // Return if no target node or if over the same cell as the source of the drag.
                    if (!target || target.node === dragData.item.parentNode) {
                        return;
                    }
                    

                    // if no task, then we're moving the story
                    if ( !task ) {
                        if ( destRecordID !== sourceRecordID) {
                            self.dropOK = true;

                            var source_index = store.indexOf(dragData.record),
                                target_index = store.indexOf(target.record),
                                store_count = store.getCount();
                            
                            var config = {};
                            var borderStyle = '2px solid ' + me.dropLineColor;
                            
                            if ( target_index > source_index ) {
                                dragData.dropPosition = 'after';
                                config.borderBottom = borderStyle;
                            } else {
                                dragData.dropPosition = 'before';
                                config.borderTop  = borderStyle;
                            }
                            Ext.fly(target.node).applyStyles(config);
                        }
                        return;
                    }
                    
                    self.dropOK = true;

                    // Can only drop tasks onto the same row
                    if (destRecordID !== sourceRecordID) {
                        self.dropOK = false;
                    }

                    if ( self.dropOK ) {
                        if (me.dropCls) {
                            Ext.fly(target.node).addCls(me.dropCls);
                        } else {
                            Ext.fly(target.node).applyStyles({
                                backgroundColor: me.dropBackgroundColor
                            });
                        }
                    } else {
                        if (me.noDropCls) {
                            Ext.fly(target.node).addCls(me.noDropCls);
                        } else {
                            Ext.fly(target.node).applyStyles({
                                backgroundColor: me.noDropBackgroundColor
                            });
                        }
                    }
                },

                // Return the class name to add to the drag proxy. This provides a visual indication
                // of drop allowed or not allowed.
                onNodeOver: function (target, dd, e, dragData) {
                    return this.dropOK ? this.dropAllowed : this.dropNotAllowed;
                },

                // Highlight the target node.
                onNodeOut: function (target, dd, e, dragData) {
                    var cls = this.dropOK ? me.dropCls : me.noDropCls;

                    if (cls) {
                        Ext.fly(target.node).removeCls(cls);
                    } else {
                        Ext.fly(target.node).applyStyles({
                            backgroundColor: '',
                            borderTop: '',
                            borderBottom: ''
                        });
                    }
                },

                // Process the drop event if we have previously ascertained that a drop is OK.
                onNodeDrop: function (target, dd, e, dragData) {
                    if (this.dropOK) {
                        
                        var target_row = target.record;
                        var target_column = target.columnName;
                        var target_record = target.record.get('__WorkProduct');
                        
                        var source_task = dragData.task;
                        var source_column = dragData.columnName;
                        var source_record = dragData.record.get('__WorkProduct');
                        
                        console.log('source task:', source_task);
                        
                        if ( source_task ) {
                            if ( source_column == target_column ) {
                                // since we're in the same row, nothing to do!
                                return true;
                            }
                            
                            target_row.changeTaskColumn(source_task, source_column, target_column);
                        } else {
                            var dropPosition = dragData.dropPosition || "after";

                            if ( source_record.get('ObjectID') == target_record.get('ObjectID') ) {
                                return;
                            }
                            
                            target_row.rankRelative(source_record, target_record, dropPosition);
                        }
                        
                        return true;
                    }
                },

                onCellDrop: Ext.emptyFn
            });
        }
    },
    
    _getTaskFromRecord: function(card_id, row) {
        
        if ( Ext.isEmpty(card_id) ) {
            return null;
        }
        var task_id = card_id.replace(/T/,"");
        var item = null;
        Ext.Array.each(row.get('__Tasks'), function(task){
            var oid = task.get('ObjectID');
            if ( ""+oid == task_id ) {
                item = task;
            }
        });
        
        Ext.Array.each(row.get('__Defect'), function(defect){
            var oid = defect.get('ObjectID');
            if ( ""+oid == task_id ) {
                item = defect;
            }
        });
        
        return item;
    }
    
});