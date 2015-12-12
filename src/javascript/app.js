Ext.define("TSSuperCardboard", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    
    iteration: null,
    
    settingsScope: 'project',

    config: {
        defaultSettings: {
            taskStateField: "State"
        }
    },
    
    layout: { type: 'border' },
    
    items: [
        {xtype:'container', itemId:'selector_box', region: 'north',  layout: { type:'hbox' }, minHeight: 25},
        {xtype:'container', itemId:'display_box' , region: 'center', layout: { type: 'border'} }
    ],
    
    launch: function() {
        var me = this;
        this._addSelectors();
    }, 
    
    _addSelectors: function() {
        var container = this.down('#selector_box');
        container.add({
            xtype: 'rallyaddnew',
            ignoredRequiredFields: ['Name', 'Project', 'ScheduleState','State'],
            recordTypes: ['User Story','Defect'],
            listeners: {
                scope: this,
                create: function( button, created_record){
                    var me = this;
                    var iteration = this.iteration || this.down('rallyiterationcombobox').getRecord();
                    
                    if ( iteration ) {
                        created_record.set('Iteration', { _ref: iteration.get('_ref') } );
                        created_record.save({
                            callback: function(result, operation) {
                                if(operation.wasSuccessful()) {
                                    me.updateData();
                                }
                            }
                        });
                    }
                }
            }
        });
        
        container.add({
            itemId:'spacer',
            xtype: 'container',
            flex: 1
        });
        
        container.add({
            xtype:'rallyiterationcombobox',
            listeners: {
                scope: this,
                change: function(combo) {
                    this.iteration = combo.getRecord();
                    this.updateData();
                }
            }
        });
    },
    
    updateData: function()  { 
        var me = this;
        
        if ( this.down('tssprinttable') ) { this.down('tssprinttable').destroy(); }
        
        this.setLoading('Fetching items in iteration ' + this.iteration.get('Name'));
        
        var columnSettings = null;
        if ( !Ext.isEmpty(this.getSetting('columns') ) ){
            columnSettings = this.getSetting('columns');
            if ( Ext.isString(columnSettings)) {
                columnSettings = Ext.JSON.decode(columnSettings);
            }
        }
        this.sprint_table = this.down('#display_box').add({ 
            xtype: 'tssprinttable',
            iteration: this.iteration,
            taskStateField: this.getSetting('taskStateField'),
            columnSettings: columnSettings,
            region: 'center',
            layout: 'fit',
            listeners: {
                gridReady: function() {
                    me.setLoading(false);
                }
            }
        });
    },
    
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        
        //Ext.apply(this, settings);
        this.launch();
    },
    
    _filterOutExceptChoices: function(store) {
        var app = Rally.getApp();
        
        store.filter([{
            filterFn:function(field){ 
                
                var forbidden_fields = ['Recycled','Ready'];
                if ( Ext.Array.contains(forbidden_fields, field.get('name') ) ) {
                    return false;
                }
                
                var attribute_definition = field.get('fieldDefinition').attributeDefinition;
                var attribute_type = null;
                if ( attribute_definition ) {
                    attribute_type = attribute_definition.AttributeType;
                }
                if (  attribute_type == "BOOLEAN" ) {
                    return false;
                }
                if ( attribute_type == "STRING" || attribute_type == "STATE" ) {
                    if ( field.get('fieldDefinition').attributeDefinition.Constrained ) {
                        return true;
                    }
                }
                return false;
            } 
        }]);
    },
    
    getSettingsFields: function() {
        var me = this;
        
        return [{
            name: 'taskStateField',
            xtype: 'tsmultimodelfieldcombobox',
            fieldLabel: 'Child Item Column Field',
            labelWidth: 150,
            labelAlign: 'left',
            minWidth: 400,
            margin: 10,
            autoExpand: false,
            alwaysExpanded: false,
            models: 'Task,Defect',
            listeners: {
                select: function(field_box) {
                    this.fireEvent('fieldselected', field_box.getRecord().get('fieldDefinition'));
                },
                
                ready: function(field_box) {
                me._filterOutExceptChoices(field_box.getStore());
                    if (field_box.getRecord()) {
                        this.fireEvent('fieldselected', field_box.getRecord().get('fieldDefinition'));
                    }
                }
            },
            bubbleEvents: ['fieldselected', 'fieldready']
        },
            
        {
            name: 'columns',
            readyEvent: 'ready',
            fieldLabel: '',
            margin: '5px 0 0 80px',
            xtype: 'tscolumnsettingsfield',
            handlesEvents: {
                fieldselected: function(field) {
                    this.refreshWithNewField(field);
                }
            },
            listeners: {
                ready: function() {
                    this.fireEvent('columnsettingsready');
                }
            },
            bubbleEvents: 'columnsettingsready'
        }];
    }
        
});
