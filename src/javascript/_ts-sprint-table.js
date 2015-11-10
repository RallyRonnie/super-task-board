/**
 */
 
 Ext.define('Rally.technicalservices.SprintTable', {
    extend: 'Ext.Container',

    alias: 'widget.tssprinttable',

    /**
     * @property {String} cls The base class applied to this object's element
     */
    cls: "tssprint",

    config: {
        /**
         * @cfg {Ext.data.Model} iteration 
         *
         */
        iteration: null,
        /**
         * 
         * @cfg String
         * 
         * The name of the field that is used for the task columns
         * 
         */
        taskStateField: 'State'
    },
    
    /**
     * @constructor
     * @param {Object} config
     */
    constructor: function (config) {
        this.mergeConfig(config);
        
        this.callParent([this.config]);
    },

    initComponent: function () {
        this.callParent(arguments);
        
        this.addEvents(
            /**
             * @event
             * Fires when the grid has been rendered
             * @param {Rally.technicalservices.SprintTable} this
             * @param {Rally.ui.grid.Grid} grid
             */
            'gridReady'
        );
        
        this._getFieldValues('task',this.taskStateField).then({
            success: function(task_values) {
                var columns = this._getColumns(task_values);
                this._defineCustomModel(columns);
                
                var table_store = Ext.create('Rally.data.custom.Store',{ model: 'TSTableRow' });
                
                this.grid = this.add({ 
                    xtype:'rallygrid', 
                    store: table_store,
                    columnCfgs: columns,
                    showPagingToolbar : false,
                    showRowActionsColumn : false,
                    sortableColumns: false,
                    disableSelection: true
                });
                
                this._loadCards();
            },
            failure: function(msg) {
                Ext.Msg.alert('Problem finding valid field values', msg);
            },
            scope: this
        });
        
    },
    
    _loadCards: function() {
        var iteration_filter = [{property:'Iteration',value:''}];
        if ( this.iteration ) {
            iteration_filter = [{property:'Iteration.Name', value:this.iteration.get('Name')}];
        }
        
        var story_store = Ext.create('Rally.data.wsapi.Store',{
            model: 'HierarchicalRequirement',
            sorters: [{property:'DragAndDropRank',direction:'ASC'}],
            filters: iteration_filter,
            fetch: ['FormattedID', 'Name', 'ObjectID']
        });
                
        story_store.load({
            scope: this,
            callback : function(records, operation, successful) {
                if (successful){
                    this._updateRows(records, this.grid.getStore());
                } else {
                    console.error('Problem loading: ' + operation.error.errors.join('. '));
                    Ext.Msg.alert('Problem loading milestones', operation.error.errors.join('. '));
                }
            }
        });
    },

    _defineCustomModel: function(columns) {
        var me = this;
        
        var task_state_field = this.taskStateField;
        
        var fields = Ext.Array.map(columns, function(column){
            var name = column.dataIndex;
            var type = 'object';
            return { name: name, type: type };
        });
        
        Ext.define('TSTableRow', {
            extend: 'Ext.data.Model',
            fields: fields,
            
            addTasks: function(tasks) {
                Ext.Array.each(tasks, function(task){
                    var state = task.get(task_state_field);
                    if ( Ext.isEmpty(this.get(state)) ) {
                        this.set(state, [task.getData()]);
                    } else {
                        var saved_tasks = this.get(state);
                        saved_tasks.push(task.getData());
                        this.set(state, saved_tasks);
                    }
                },this);
            }
        });
    },
    
    taskTemplate: new Ext.XTemplate(
        "<tpl for='.'>",
            "<div class='ts_task_card' style='background-color:{DisplayColor};'>{Name:ellipsis(15, false)}</div>",
        "</tpl>"
    ),
    
    workproductTemplate: new Ext.XTemplate(
        "<tpl for='.'>",
            '<div class="x4-component rui-card {_type} x4-border-box drag-handle">',
            '<div class="artifact-color"></div>',
            "<div class='ts_workproduct_card' style='background-color:{DisplayColor};'>{Name}</div>",
            '</div>',
        "</tpl>"
    ),
    
    _getColumns: function(task_states) {
        var me = this;
        
        var columns = [{
            dataIndex: 'WorkProduct',
            text: 'Features',
            flex: 1,
            align: 'center',
            renderer: function(value) {
                return me.workproductTemplate.apply([value.getData()]);
            }
        }];
        
        Ext.Array.each(task_states, function(state){
            columns.push({
                dataIndex: state,
                text: state || "No Entry",
                flex: 1,
                align: 'center',
                renderer: function(value) {
                    return me.taskTemplate.apply(value);
                }
            });
        });
            
        columns.push({ 
            dataIndex: 'Done',
            text: 'Done',
            flex: 1,
            align: 'center'
        });
        
        return columns;
    },
    
    _updateRows: function(workproducts, table_store) {
        var me = this;
        var promises = [];
        
        Ext.Array.each(workproducts, function(workproduct){
            var oid = workproduct.get('ObjectID');
            promises.push( function() { return me._loadTasksForArtifact(oid); } );
        });
        
        Deft.Chain.sequence(promises).then({
            scope: this,
            success: function(results) {
                var me = this;
                
                var tasks_by_workproduct = {};
                // collapse an array of hashes into one hash
                Ext.Array.each(results, function(tasks_by_a_workproduct){
                    tasks_by_workproduct = Ext.apply(tasks_by_workproduct, tasks_by_a_workproduct);
                });

                var rows = this._getRowsFromWorkproducts(workproducts,tasks_by_workproduct);

                table_store.loadRecords(rows);
                this.fireEvent('gridReady', this, this.grid);
            },
            failure: function(msg) {
                Ext.Msg.alert('Problem loading artifacts', msg);
            }
        });
    },
    
    _getRowsFromWorkproducts: function(workproducts,tasks_by_workproduct) {
        var rows = [];
        var me = this;
        
        Ext.Array.each( workproducts, function(workproduct){
            var row = Ext.create('TSTableRow',{
                WorkProduct: workproduct
            });
            
            row.addTasks(tasks_by_workproduct[workproduct.get('ObjectID')] || []);
            
            rows.push(row);
        });
        
        return rows;
    },
    
    _loadTasksForArtifact: function(oid) {
        var deferred = Ext.create('Deft.Deferred');
        
        var config = {
            model: 'Task',
            fetch: ['FormattedID', 'Name', 'ObjectID','Project',this.taskStateField],
            filters: [{property:'WorkProduct.ObjectID', operator: 'contains', value: oid}]
        };
        
        TSUtilities.loadWSAPIItems(config).then({
            scope: this,
            success: function(tasks) {
                
                var tasks_by_workproduct = {};
                tasks_by_workproduct[oid] = tasks;
                deferred.resolve(tasks_by_workproduct);
            },
            failure: function(msg) {
                deferred.reject(msg);
            }
        });

        return deferred;
    },
    
    _getFieldValues: function(model_name,field_name){
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: model_name,
            success: function(model) {
                model.getField(field_name).getAllowedValueStore().load({
                    callback: function(records, operation, success) {
                        var valid_values = Ext.Array.map(records, function(allowed_value){
                            return allowed_value.get('StringValue');
                        });
                        deferred.resolve(valid_values);
                    }
                });
            }
        });
        return deferred;
    }

    

});
