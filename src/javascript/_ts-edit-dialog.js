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
        this.height = this.height || Ext.Array.min([ 500, Ext.getBody().getHeight() - 50 ]),
        
        this.callParent([this.config]);
    },

    initComponent: function() {
        this.callParent(arguments);
        
        this._addFields();
    },
    
    _getTitle: function(record) {
        var icon = Rally.technicalservices.IconUtility.getIconForType(record.get('_type'));
        
        return Ext.String.format("<span class='{0}'> </span>{1}", icon, record.get('FormattedID'));
    },
    
    
    _addFields: function() {
        var display_fields = [ 
            { text: 'Name', dataIndex: 'Name', editor: { xtype:'rallytextfield', height: 25 } },
            { text: 'Owner', dataIndex: 'Owner', editor: {
                    xtype: 'rallyusersearchcombobox'
                }
            }
        ];
        
        if ( this.record.get('_type') == 'task' ) {
            Ext.Array.push(display_fields, [
                { text: 'Estimate', dataIndex: 'Estimate', editor: { xtype: 'rallynumberfield', minValue: 0 } },
                { text: 'To Do', dataIndex: 'ToDo', editor: { xtype: 'rallynumberfield', minValue: 0}}
            ]);
        } else {
            display_fields.push({ text: 'Story Points', dataIndex: 'PlanEstimate', editor: { xtype: 'rallynumberfield', minValue: 0}});
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
                    return '';
                }
                
                return "<div style='width:20px;height:20px;background-color:" + value + "'></div>";
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
            record.save();
            row.updateExistingRecord(record);
        }
    }
    
});