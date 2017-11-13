Ext.define('Rally.technicalservices.artifact.EditDialog', {
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.tseditdialog',

    requires: ['Rally.technicalservices.IconUtility'],
    
    config: {
        /**
         * @cfg {Rally.data.Model} record
         * The record that we're editing.
         */
        record: null,
        /**
         * 
         * @cfg {Rally.data.Model} row 
         * The record for the work item row that the item belongs to
         */
        row: null,
        autoShow : true,
        closable : true
    },
    

    constructor: function(config) {
        if (this.autoCenter) {
            this.scrollListener = Ext.create('Rally.ui.ScrollListener', this.center, this);
        }

        this.mergeConfig(config);
        
        if ( !this.record ) {
            throw "Rally.technicalservices.artifact.EditDialog requires a record";
        }
        this.title = config.title || this._getTitle( this.record );
        
        this.width = this.width || Ext.Array.min([ 600, Ext.getBody().getWidth() - 50 ]);
        this.height = this.height || Ext.Array.min([ 600, Ext.getBody().getHeight() - 50 ]),
        
        this.callParent([this.config]);
    },

    initComponent: function() {
        var me = this;
        this.callParent(arguments);
        
        this.addEvents(
            /**
             * @event artifactdeleted
             * Fires when user clicks delete
             * @param {Rally.technicalservices.artifact.EditDialog} source the dialog
             */
            'artifactdeleted'
        );
        
        this._addButtons();
        this._addFields();
        
        this.on('render', function(dialog) {
            var pickers = Ext.query('#color-block');
            
            if ( pickers.length === 0 ) {
                console.log('Cannot find square with id color-block');
            } else {
                var target = Ext.get(pickers[0]);
                
                target.on('click', function(evt,c) {
                    Rally.ui.popover.PopoverFactory.bake({
                        target: target,
                        field: 'Color',
                        record: me.record,
                       
                        _onColorClick: function(e) {
                            var el = Ext.get(Ext.isIE ? e.target : e.currentTarget);
                            el.addCls('selected');
                
                            var selectedColor = el.hasCls('clear-color') ? null : el.getColor('background-color');
                            target.setStyle('background-color',selectedColor);
                                                        
                            me.record.set('DisplayColor', selectedColor);
                            me.record.save({
                                success: function(result) {
                                    me.row.updateExistingRecord(result);
                                }
                            });
                            this.destroy();
                        }
                    });
                },this);
            }
        });
    },
    
    _addButtons: function() {
        this.addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [{
                xtype: 'rallybutton',
                text: 'Done',
                cls: 'secondary rly-small',
                handler: this.close,
                scope: this,
                ui: 'link'
            },{
                xtype: 'rallybutton',
                itemId: 'deleteButton',
                text: 'Delete',
                cls: 'primary rly-small',
                scope: this,
                disabled: false,
                handler: function() {
                    this._deleteRecord();
                    this.close();
                }
            }]
        });
    },
    
    _getTitle: function(record) {
        var icon = Rally.technicalservices.IconUtility.getIconForType(record.get('_type'));
        return Ext.String.format("<span class='{0}'> </span><a href='{1}' target='_parent'>{2}</a>", 
            icon, 
            Rally.nav.Manager.getDetailUrl(record),
            record.get('FormattedID')
        );
    },
    
    
    _addFields: function() {
        var display_fields = [ 
            { text: 'Name', dataIndex: 'Name', editor: { xtype:'rallytextfield', height: 25 } },
            { text: 'Owner', dataIndex: 'Owner', editor: {
                    xtype: 'rallyusersearchcombobox',
                    project: Rally.getApp().getContext().getProject()._ref
                }
            }
        ];
        
        if ( this.record.get('_type') == 'task' ) {
            Ext.Array.push(display_fields, [
                { text: 'Estimate', dataIndex: 'Estimate', editor: { xtype: 'rallynumberfield', minValue: 0 } },
                { text: 'To Do', dataIndex: 'ToDo', editor: { xtype: 'rallynumberfield', minValue: 0}},
                { text: 'Actuals', dataIndex: 'Actuals', editor: { xtype: 'rallynumberfield', minValue: 0}}
            ]);
        } else {
            display_fields.push({ text: 'Story Points', dataIndex: 'PlanEstimate', editor: { xtype: 'rallynumberfield', minValue: 0}});
            display_fields.push({ text: 'Schedule State', dataIndex: 'ScheduleState', editor: {
                xtype: 'rallyfieldvaluecombobox',
                model: this.record.get('_type'),
                field: 'ScheduleState'
            }});
        }
        
        display_fields = Ext.Array.push(display_fields, [
            { text: 'Blocked', dataIndex: 'Blocked', editor: {
                xtype: 'rallyfieldvaluecombobox',
                model: this.record.get('_type'),
                field: 'Blocked'
            }},
            { text: 'Blocked Reason', dataIndex: 'BlockedReason', editor: { xtype:'rallytextfield', height: 25 }}, 
            { text: 'Color', dataIndex: 'DisplayColor', renderer: function(value) {
                if ( Ext.isEmpty(value) ) {
                    return "<div id='color-block' style='width:20px;height:20px;border:1px solid black'></div>";
                }
                
                return "<div  id='color-block' style='width:20px;height:20px;background-color:" + value + "'></div>";
            }}, 
            { text: 'Description', dataIndex: 'Description', editor: { xtype: 'rallyrichtexteditor', height: 150 } }
        ]);
        
        Ext.Array.each(display_fields, function(field) {
            this._addField(this.record, field);
        },this);
    },
    
    _addField: function(record, field_def) {
        var container = Ext.create('Ext.container.Container',{
            layout: { type: 'hbox'},
            cls: 'ts-editor-container'
        });
        
        container.add({
            xtype: 'container',
            html: field_def.text,
            width: 150,
            cls: 'ts-editor-field-label',
            padding: 5,
            margin: 2
        });
        
        var value = record.get(field_def.dataIndex);

        if ( field_def.renderer ) {
            value = field_def.renderer.call(this, value,null,record);
        }
        
        var edit_configure = {
            xtype:'container',
            cls: 'ts-editor-field-contents',
            padding: 3,
            margin: 2
        };
        
        if ( field_def.editor ) {
            edit_configure.items = [Ext.apply({ 
                value: value,
                width: 300,
                project: record.get('Project')._ref,
                listeners: {
                    scope: this,
                    blur: function(editor) { 
                        this._changeAndSave(editor,field_def);
                    }
                }
            }, field_def.editor)];
        } else {
            edit_configure.html = value;
        }
        
        container.add(edit_configure);
        
        this.add( container );
    },
    
    _changeAndSave: function(editor, field_def) {
        var record = this.record;
        var row = this.row;
        
        var field_name = field_def.dataIndex;
        if ( !Ext.isEmpty(field_name) ) {
            record.set(field_def.dataIndex, editor.getValue());
            record.save({
                callback: function(result) {
                    row.updateExistingRecord(result);
                }
            });
        }
    },
    
    _deleteRecord: function() {
        var me = this;
        var row = this.row;

        var record = this.record;
        var type = record.get('_type');
        
        row.removeRecord(record);
        
        record.destroy({
            callback: function(result, operation) {
                if(operation.wasSuccessful()) {                    
                    if ( type != "defect" && type != "task" ) {
                        this.fireEvent('artifactdeleted', this);
                    } else {
                        row.updateExistingRecord(null);
                    }
                }
            }
        });
        

        
    }
    
});