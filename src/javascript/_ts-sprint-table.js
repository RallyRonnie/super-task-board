/**
 */
 
 Ext.define('Rally.technicalservices.SprintTable', {
    extend: 'Ext.Container',
    alias: 'widget.tssprinttable',

    requires: ['Rally.technicalservices.IconUtility'],
    
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
        taskStateField: 'State',
        /**
         * 
         * @cfg {object} 
         * Has a key for each allowed value in taskStateField and values for show and a task State to map to it
         * 
         */
        columnSettings: null

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
        var me = this;
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
                
                this.state_values = task_values;
                
                this.table_store = Ext.create('Rally.data.custom.Store',{
                    model: 'TSTableRow',
                    sorters: [{property:'DragAndDropRank', direction:'ASC'}]
                });
                
                this._makeGrid();
            },
            failure: function(msg) {
                Ext.Msg.alert('Problem finding valid field values', msg);
            },
            scope: this
        });
        
    },
    
    _makeGrid: function() {
        this.removeAll();
        var table_store = this.table_store;
        
        var me = this;
        var columns = this._getColumns(this.state_values);
        this._defineCustomModel(columns);
                
        this.grid = this.add({ 
            xtype:'rallygrid', 
            store: table_store,
            columnCfgs: columns,
            showPagingToolbar : false,
            showRowActionsColumn : false,
            sortableColumns: false,
            disableSelection: true,
            enableColumnMove: false,
            viewConfig: {
                listeners: {
                    scope: this,
                    itemupdate: function(row) {
                        var tasks = row.get('__Tasks') || [];
                        var defects = row.get('__Defects') || [];
                        
                        var items = Ext.Array.push(tasks,defects);
                        
                        Ext.Array.each(items, function(record) {
                            var record_oid = record.ObjectID || record.get('ObjectID');
                            this._createTaskCard(record_oid,record,row);
                        },this);
                        this._setWorkItemListeners([row]);
                    }
                },
                plugins: [
                    {
                        ptype: 'tscelldragdrop'
                    }
                ]
            }
        });
        
        this._loadCards();
    },
    
    applyOwnerFilter: function(user_ref) {
        this.userFilter = user_ref;
        
        var store = this.grid && this.grid.getStore();
        
        if ( !store ) { return; }
        
        var original_rows = Ext.clone( this._original_rows );
        var rows = [];
        
        store.removeAll(true);
        
        if ( user_ref == 'all' ) {
            rows = original_rows;
        } else {
            Ext.Array.each( original_rows, function(original_row) {
                var workproduct = original_row.get('__WorkProduct');
                var original_tasks   = original_row.get('__Tasks');
                var original_defects = original_row.get('__Defects');
                
                var wp_owner = workproduct.get('Owner');
                if ( !Ext.isEmpty(wp_owner) && wp_owner._ref == user_ref || Ext.isEmpty(wp_owner) && Ext.isEmpty(user_ref)) {
                    rows.push(original_row);
                } else {
                    var row = Ext.create('TSTableRow',{
                        DragAndDropRank: workproduct.get('DragAndDropRank'),
                        __WorkProduct: workproduct,
                        __Tasks: [],
                        __Defects: []
                    });
        
                    var tasks = Ext.Array.filter(original_tasks, function(item){
                        var owner = item.get('Owner');
                        return (owner && owner._ref == user_ref || Ext.isEmpty(owner) && Ext.isEmpty(user_ref));
                    });
                                
                    var defects = Ext.Array.filter(original_defects, function(item){
                        var owner = item.get('Owner');
                        return (owner && owner._ref == user_ref || Ext.isEmpty(owner) && Ext.isEmpty(user_ref));
                    });
                    
                    row.addTasks(tasks);
                    row.addDefects(defects);
                    
                    if ( tasks.length > 0 || defects.length > 0 ) {
                        rows.push(row);
                    }
                }
            });
        }
        
        store.loadRecords(rows);
        this._addTaskCards(rows);
        this._setWorkItemListeners(rows);
        
    },
    
    _loadCards: function() {
        var me = this;
        
        Deft.Chain.sequence([
            function() { return me._loadWorkItems('HierarchicalRequirement'); },
            function() { return me._loadWorkItems('Defect'); }
        ]).then({
            scope: this,
            success: function(results) {
                var records = Ext.Array.flatten(results);
                
                this._updateRows(records, this.grid.getStore()).then({
                    scope: this,
                    success: function(rows) {
                        this._addTaskCards(rows);
                        this._setWorkItemListeners(rows);
                        this.fireEvent('gridReady', this, this.grid);
                    }
                });
            },
            failure: function(msg) {
                Ext.Msg.alert("Problem Loading Iteration Work Items", msg);
            }
        });
        
    },
    
    _setWorkItemListeners: function(rows) {
        this._setWorkItemCardListeners(rows);
        this._setWorkItemAdderListeners(rows,'task');
        this._setWorkItemAdderListeners(rows,'defect');
    },

    _loadWorkItems: function(artifact_type) {
        var deferred = Ext.create('Deft.Deferred');
        
        var iteration_filter = [{property:'Iteration',value:''}];
        if ( this.iteration ) {
            iteration_filter = [{property:'Iteration.Name', value:this.iteration.get('Name')}];
        }
        
        var store = Ext.create('Rally.data.wsapi.Store',{
            model: artifact_type,
            context: { projectScopeDown: false, projectScopeUp: false },
            sorters: [{property:'DragAndDropRank',direction:'ASC'}],
            filters: iteration_filter,
            fetch: ['FormattedID', 'Name', 'ObjectID','Owner','PlanEstimate',
                'Blocked','Owner','BlockedReason','Description','DragAndDropRank','ScheduleState']
        });
                
        store.load({
            scope: this,
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    deferred.reject( operation.error.errors.join('. ') );
                }
            }
        });
        return deferred.promise;
    },
    
    _defineCustomModel: function(columns) {
        var me = this;
        
        var task_state_field = this.taskStateField;
        var columnSettings = this.columnSettings;
                
        var fields = Ext.Array.map(columns, function(column){
            var name = column.dataIndex;
            var type = 'object';
            return { name: name, type: type };
        });
        
        fields.push({name: '__Tasks',         type: 'object', defaultValue: []});
        fields.push({name: '__Defects',       type: 'object', defaultValue: []});
        fields.push({name: '_version',        type: 'number', defaultValue: 0});
        fields.push({name: 'DragAndDropRank', type: 'string'});
        
        Ext.define('TSTableRow', {
            extend: 'Ext.data.Model',
            fields: fields,
            
            addTasks: function(tasks) {
                        
                // assign empty ones to first displayed state (column)
                var columns = me.grid.getColumnCfgs();
                var first_state = columns[1].dataIndex;
              
                
                Ext.Array.each(tasks, function(task){
                    var state = task.get(task_state_field);
                    if (Ext.isEmpty(state) && !Ext.isEmpty(first_state) ) {
                        state = first_state;
                        task.set(task_state_field,state);
                        task.save();
                    }
                    
                    if ( Ext.isEmpty(this.get(state)) ) {
                        this.set(state, [task.getData()]);
                    } else {
                        var saved_tasks = this.get(state);
                        saved_tasks.push(task.getData());
                        this.set(state, saved_tasks);
                    }
                    
                    var old_tasks = this.get('__Tasks') || [];
                    var total_tasks = Ext.Array.merge( old_tasks, [task]);
                    this.set('__Tasks',total_tasks);
                },this);
            },
            
            addDefects: function(defects) {
                
                Ext.Array.each(defects, function(defect){
                    var state = defect.get(task_state_field);
                    if ( Ext.isEmpty(this.get(state)) ) {
                        this.set(state, [defect.getData()]);
                    } else {
                        var saved_defects = this.get(state);
                        saved_defects.push(defect.getData());
                        this.set(state, saved_defects);
                    }
                    
                    var old_defects = this.get('__Defects') || [];
                    var total_defects = Ext.Array.merge( old_defects, [defect]);
                    this.set('__Defects',total_defects);
                },this);
            },
            
            removeRecord: function(record) {
                console.log('removeRecord',record);
                var item_array = [];
                var state = null;
                
                if ( record.get('_type') == "task" ) {
                    item_array = '__Tasks';
                }
                
                if ( record.get('_type') == "defect" ) {
                    item_array = '__Defects';
                }
                
                if ( item_array.length > 0 ) {
                    state = record.get(task_state_field);
                    var state_array = this.get(state);
                    var clean_array = Ext.Array.filter(state_array, function(old_item){
                        return ( old_item.ObjectID != record.get('ObjectID') );
                    });
                    this.set(state, clean_array);
                } else {
                    this.destroy();
                }
            },
            
            changeTaskColumn: function(record, source_column, target_column) {
                // remove from existing column list in row record
                var old_column_items = this.get(source_column) || [];
                var new_column_items = this.get(target_column) || [];
                var record_data = record.getData();
                
                new_column_items.push(record_data);
                this.set(target_column, new_column_items);
                
                this.set(source_column, 
                    Ext.Array.filter(old_column_items, function(old_item) {
                        return ( old_item.ObjectID != record_data.ObjectID );
                    })
                );
                
                this.setItemField(record, task_state_field, target_column);
            },
            
            // given a task, defect or workproduct that is already known by 
            // this row, replace it with an updated version
            updateExistingRecord: function(record) {
                var version = this.get('_version') || 0;
                if ( this.get('_type') == "hierarchicalrequirement" ) {
                    version++;
                    this.set('_version', version);
                    
                    return;
                } 

                // reload the workproduct for rolled up states
                var wp = this.get('__WorkProduct');
                
                wp.getProxy().getModel().load(wp.get('ObjectID'), {
                    scope: this,
                    success: function(result) {
                        this.set('__WorkProduct', result);
                        // need to change another field to signal the store for listeners (refresh)
                        version++;
                        this.set('_version', version);
                    }
                });

            },
            
            setItemField: function(record, field_name, value) {                
                record.set(field_name, value);
                
                if ( record.get('_type') == 'task' && field_name !== "State" && field_name == task_state_field && !Ext.isEmpty( columnSettings )) {
                    var setting = columnSettings[value];
                    if ( !Ext.isEmpty(setting['stateMapping'])) {
                        record.set('State', setting['stateMapping']);
                    }
                }
                record.save().then({
                    scope: this,
                    success: function() { this.updateExistingRecord(record); } 
                });
            },
            
            rankRelative: function(recordToRank, relativeRecord, dropPosition){
            
                Rally.data.Ranker.rankRelative({
                    recordToRank: recordToRank,
                    relativeRecord: relativeRecord,
                    position: dropPosition,
                    saveOptions: {
                        scope: me,
                        callback: function() {
                            me._makeGrid();
                        }
                    }
                });
            }
        });
    },
    
    _createTaskCard: function(record_oid, record,row){
        var me = this;
        
        var tasks = Ext.query('#' + record_oid);
        
        if ( tasks.length === 0 ) {
            console.log('Cannot find display spot for task', record_oid);
        } else {
            var card_element = Ext.get(tasks[0]);
            card_element.setHTML('');
            
            if ( this.down('#child_' + record_oid) ) {
                this.down('#child_' + record_oid).destroy();
            }
            var card = Ext.create('Rally.technicalservices.sprintboard.TaskCard',{
                record: record,
                itemId: 'child_' + record_oid,
                renderTo: card_element
            });
            
            card_element.on('click', function(evt,c) {
                this._showQuickView(record,row);
            },this);
        }
    },
    
    workproductTemplate: new Ext.XTemplate(
        "<tpl>",
            '<div class="x4-component rui-card {_type} x4-border-box xdrag-handle cardboard {[this.getBlockedClass(values.Blocked)]}">',
                '<div class="artifact-color"></div>',
                '<div class="card-table-ct {_type}" id="{ObjectID}" type={_type}">',
                    '<table class="card-table column-container">',
                        '<tr>',
                            '<td class="rui-card-content">',
                                '<div class="left-header">',
                                    '<div class="id" style="min-width: 68px">',
                                        '<span class="formatted-id-template">',
                                            '<a class="formatted-id-link" target="_blank" href="{[this.getArtifactURL(values)]}">',
                                                '<span class="{[this.getArtifactIcon(values)]}"> </span> {FormattedID}',
                                            '</a>',
                                        '</span>',
                                    '</div> ',
                                    '<div class="owner-name">{[this.getOwnerName(values.Owner)]}</div>',
                                '</div>',
                                '<div class="field-content Name type-string">',
                                    '<div class="rui-field-value">{Name}</div>',
                                '</div>',
                                '<div class="field-content ScheduleState type-string">',
                                    '<div class="rui-field-value">{ScheduleState}</div>',
                                '</div>',
                            '</td>',
                            
                            '<td class="rui-card-right-side has-estimate">',
                                '<div class="right-top-side">',
                                    '<div class="card-owner-field">',
                                        '<div class="field-content Owner">',
                                            '<div class="rui-field-value">',
                                                '{[this.getOwnerImage(values.Owner)]}',
                                            '</div>',
                                        '</div>',
                                    '</div>',
                                '</div>',
                                '<div class="right-bottom-side">',
                                '<div class="card-estimate-field">',
                                    '<div class="field-content PlanEstimate xeditable" >',
                                        '<div class="rui-field-value">{PlanEstimate}</div>',
                                    '</div>',
                                '</div>',
                            '</div>',
                            '</td>',
                            
                        '<tr/>',
                    '</table>',
                '</div>',
            '</div>',
            '<div class="actions">',
                '+<span id="add_task_to_{ObjectID}" class="icon-task add-task"> </span>',
                '+<span id="add_defect_to_{ObjectID}" class="icon-defect add-defect"> </span>',
            '</div>',
        "</tpl>",
        {
            getArtifactURL: function(record){
                return Rally.nav.Manager.getDetailUrl(record);
            },
            
            getBlockedClass: function(blocked) {
                if ( blocked !== true ) {
                    return "";
                }
                return "blocked";
            },
            getOwnerName: function(owner) {
                if ( Ext.isEmpty(owner) ) {
                    return "--";
                }
                return owner._refObjectName;
            },
            getOwnerImage: function(owner) {
                if (Ext.isEmpty(owner)) {
                    return " ";
                }
                return Ext.String.format('<img class=" card-owner-img" src="/slm/profile/image/{0}/25.sp">', 
                    owner.ObjectID);
            },
            getArtifactIcon: function(record) {
                var type = record._type;
                
                return Rally.technicalservices.IconUtility.getIconForType(type);
            }
        }
    ),
    
    _getColumns: function(task_states) {
        var me = this;
        var columnSettings = this.columnSettings;
                
        var columns = [{
            dataIndex: '__WorkProduct',
            text: 'Features',
            flex: 1,
            align: 'center',
            renderer: function(value) {
                if ( value.get('ScheduleState') == "Accepted" ) {
                    return "";
                }
                return me.workproductTemplate.apply(value.getData());
            }
        }];

        Ext.Array.each(task_states, function(state){
            if ( Ext.isEmpty(columnSettings) || !Ext.isEmpty(columnSettings[state]) || Ext.Object.getKeys(columnSettings).length === 0 ) {
                columns.push(me._getStateColumnCfg(state));
            }
        });
        
        if ( columns.length > 1 ) {
            columns[columns.length - 1].renderer = function(value,meta,record){
                var workproduct = record.get('__WorkProduct');
                
                if ( workproduct.get("ScheduleState") == "Accepted" ) {
                    return me.workproductTemplate.apply(workproduct.getData());
                } else {
                    var html = [];
                    
                    Ext.Array.each(value, function(item){
                        html.push(
                            Ext.String.format(
                                '<div id="{0}" style="height:37px;float: left;"></div>',
                                item.ObjectID
                            )
                        );
                    });
                    
                    return html.join('\n');
                }
            };
        }
        
        return columns;
    },
    
    _getStateColumnCfg: function(state) {
        return {
            dataIndex: state,
            text: state || "No Entry",
            flex: 1,
            align: 'center',
            renderer: function(value) {
                var html = [];
                
                Ext.Array.each(value, function(item){
                    html.push(
                        Ext.String.format(
                            '<div id="{0}" style="height:37px;float: left;"></div>',
                            item.ObjectID
                        )
                    );
                });
                
                return html.join('\n');
            }
        };
    },
    
    _updateRows: function(workproducts, table_store) {
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        
        Deft.Chain.sequence([
            function() { return me._loadTasks(workproducts); },
            function() { return me._loadChildDefects(workproducts); }
        ]).then({
            scope: this,
            success: function(results) {
                var me = this;
                var tasks_by_workproduct = results[0];
                var defects_by_workproduct = results[1];
                
                var rows = this._getRowsFromWorkproducts(workproducts,tasks_by_workproduct,defects_by_workproduct);

                table_store.loadRecords(rows);

                this._original_rows = rows;
                
                deferred.resolve(rows);
            },
            failure: function(msg) {
                Ext.Msg.alert('Problem loading artifacts', msg);
                deferred.reject();
            }
        });
        return deferred.promise;
    },
    
    _loadChildDefects: function(workproducts) {
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        
        var workproducts_by_oid = {};
        Ext.Array.each(workproducts, function(workproduct){
            var oid = workproduct.get('ObjectID');
            workproducts_by_oid[oid] = workproduct;
        });
        
        var iteration_filter = [{property:'Requirement.Iteration',value:''}];
        if ( this.iteration ) {
            iteration_filter = [{property:'Requirement.Iteration.Name', value:this.iteration.get('Name')}];
        }
        
        var defect_store = Ext.create('Rally.data.wsapi.Store',{
            model: 'Defect',
            context: { projectScopeDown: false, projectScopeUp: false },
            filters: iteration_filter,
            fetch: ['FormattedID', 'Name', 'ObjectID','Owner','PlanEstimate','DisplayColor',
                'Blocked','Owner','BlockedReason','Description','Requirement', 
                this.taskStateField]
        });
        
        defect_store.load({
            scope: this,
            callback : function(records, operation, successful) {
                if (successful){
                    var defects_by_workproduct = {};
                    Ext.Array.each(records, function(record){
                        var workproduct_oid = record.get('Requirement').ObjectID;
                        if ( Ext.isEmpty(defects_by_workproduct[workproduct_oid]) ) {
                            defects_by_workproduct[workproduct_oid] = [];
                        }
                        defects_by_workproduct[workproduct_oid].push(record);
                    });
                    
                    deferred.resolve(defects_by_workproduct);
                } else {
                    console.error('Problem loading: ' + operation.error.errors.join('. '));
                    Ext.Msg.alert('Problem loading child defects', operation.error.errors.join('. '));
                }
            }
        });
        
        return deferred.promise;
    },
    
    _loadTasks: function(workproducts) {
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        
        var workproducts_by_oid = {};
        Ext.Array.each(workproducts, function(workproduct){
            var oid = workproduct.get('ObjectID');
            workproducts_by_oid[oid] = workproduct;
        });
        
        var iteration_filter = [{property:'Iteration',value:''}];
        if ( this.iteration ) {
            iteration_filter = [{property:'Iteration.Name', value:this.iteration.get('Name')}];
        }
        
        var task_store = Ext.create('Rally.data.wsapi.Store',{
            model: 'Task',
            context: { projectScopeDown: false, projectScopeUp: false },
            sorters: [{property:'TaskIndex',direction:'ASC'}],
            filters: iteration_filter,
            fetch: ['FormattedID', 'Name', 'ObjectID','DisplayColor','Description',
                'Project',this.taskStateField, 'Owner', 'Blocked', 'BlockedReason',
                'Estimate','ToDo','WorkProduct']
        });
        
        task_store.load({
            scope: this,
            callback : function(records, operation, successful) {
                if (successful){
                    var tasks_by_workproduct = {};
                    Ext.Array.each(records, function(record){
                        var workproduct_oid = record.get('WorkProduct').ObjectID;
                        if ( Ext.isEmpty(tasks_by_workproduct[workproduct_oid]) ) {
                            tasks_by_workproduct[workproduct_oid] = [];
                        }
                        tasks_by_workproduct[workproduct_oid].push(record);
                    });
                    deferred.resolve(tasks_by_workproduct);
                } else {
                    console.error('Problem loading: ' + operation.error.errors.join('. '));
                    Ext.Msg.alert('Problem loading child tasks', operation.error.errors.join('. '));
                }
            }
        });
        
        return deferred.promise;
    },
    
    _getRowsFromWorkproducts: function(workproducts,tasks_by_workproduct,defects_by_workproduct) {
        var rows = [];
        var me = this;
        
        // sort because the custom store doesn't seem to do it
        var sorted_workproducts = Ext.Array.sort(workproducts, function(a,b){
            var a_is_lower  = ( a.get('DragAndDropRank') < b.get('DragAndDropRank') );
            var a_is_higher = ( a.get('DragAndDropRank') > b.get('DragAndDropRank') );
            return a_is_lower ? -1 : ( a_is_higher) ? 1 : 0;
        });
        
        Ext.Array.each( sorted_workproducts, function(workproduct){
            var row = Ext.create('TSTableRow',{
                DragAndDropRank: workproduct.get('DragAndDropRank'),
                __WorkProduct: workproduct,
                __Tasks: [],
                __Defects: []
            });
            
            row.addTasks(tasks_by_workproduct[workproduct.get('ObjectID')] || []);
            row.addDefects(defects_by_workproduct[workproduct.get('ObjectID')] || []);
            
            rows.push(row);
        });
        
        console.log('rows:', rows);
        
        return rows;
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
    },
    
    _addTaskCards: function(rows) {
        Ext.Array.each(rows, function(row){
            
            var tasks = row.get('__Tasks') || [];
            var defects = row.get('__Defects') || [];
            
            var items = Ext.Array.push(tasks,defects);
            
            Ext.Array.each(items, function(record) {
                var record_oid = record.get('ObjectID');
                this._createTaskCard(record_oid,record,row);
            },this);
        },this);
    },
    
    _setWorkItemAdderListeners: function(rows, target_type) {
        Ext.Array.each(rows, function(row){
            var record = row.get('__WorkProduct');
            var record_oid = record.get('ObjectID');
            
            var icon_query = Ext.String.format('#add_{0}_to_{1}', target_type, record_oid);
            var add_task_icon = Ext.query(icon_query);
            
            if ( add_task_icon.length === 0 ) {
                console.log('Cannot find adder for work item', record_oid);
            } else {
                var adder_element = Ext.get(add_task_icon[0]);
                adder_element.on('click', function(evt,c) {
                    this._createNewFor(target_type, record, row);
                },this);
            }
        },this);
    },
    
    _createNewFor: function(target_type, parent_record, row) {
        var me = this;
        
        Rally.data.ModelFactory.getModel({
            type: target_type,
            success: function(model) {
                var parent_ref = parent_record.get('_ref');
                
                var config = { 
                    Name: 'New Item',
                    WorkProduct: { _ref: parent_ref } 
                };
                
                if ( target_type == "defect" ) {
                    delete config.WorkProduct;
                    config.Requirement = { _ref: parent_ref }
                }
                
                // assign to first displayed state (column)
                var columns = me.grid.getColumnCfgs();
                if ( columns.length > 1 ) {
                    config[me.taskStateField] = columns[1].dataIndex;
                }
                
                var item = Ext.create(model, config); 
                
                item.save({
                    callback: function(record,operation) {
                        if ( target_type == "task" ) {
                            row.addTasks([record]);
                        } else {
                            row.addDefects([record]);
                        }
                        me._showQuickView(record,row);
                    }
                });
                
            }
        });
    },
    
    _setWorkItemCardListeners: function(rows) {
        Ext.Array.each(rows, function(row){
            var record = row.get('__WorkProduct');
            var record_oid = record.get('ObjectID');
            var cards = Ext.query('#' + record_oid);
            
            if ( cards.length === 0 ) {
                console.log('Cannot find card for work item', record_oid);
            } else {
                var card_element = Ext.get(cards[0]);
                card_element.on('click', function(evt,c) {
                    this._showQuickView(record,row);
                },this);
            }
        },this);
    },
    
    _showQuickView: function(record,row) {
        var me = this;
        Ext.create('Rally.technicalservices.artifact.EditDialog', {
            record: record,
            row: row,
            listeners: {
                artifactdeleted: function() {
                    
                }
            }
        }).show();
    }
    

});
