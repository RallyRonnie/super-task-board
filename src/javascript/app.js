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
    
    items: [
        {xtype:'container', itemId:'selector_box', layout: { type:'hbox' }, minHeight: 25},
        {xtype:'container', itemId:'display_box'}
    ],
    
    launch: function() {
        var me = this;
        this._addSelectors();
    }, 
    
    _addSelectors: function() {
        var container = this.down('#selector_box');
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
        this.logger.log("Selected: ", this.iteration);
        var me = this;
        
        if ( this.down('tssprinttable') ) { this.down('tssprinttable').destroy(); }
        
        this.setLoading('Fetching items in iteration ' + this.iteration.get('Name'));
        
        this.sprint_table = this.down('#display_box').add({ 
            xtype: 'tssprinttable',
            iteration: this.iteration,
            taskStateField: this.getSetting('taskStateField'),
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
                ready: function(field_box) {
                    me._filterOutExceptChoices(field_box.getStore());
                }
            },
            readyEvent: 'ready'
        }];
    }
        
});
