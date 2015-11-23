Ext.define('Rally.technicalservices.artifact.EditDialog', {
    extend: 'Rally.ui.dialog.Dialog',
    alias: 'widget.tseditdialog',

    requires: ['Rally.technicalservices.IconUtility'],
    
    config: {
        /**
         * @cfg record {Rally.data.Model}
         * The record that we're editing.
         */
        record: null,
        
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
            { text: 'Name', dataIndex: 'Name' },
            { text: 'Owner', dataIndex: 'Owner', renderer: function(value) {
                if ( !value ) { return ''; }
                return value._refObjectName;
            } }
        ];
        
        if ( this.record.get('_type') == 'task' ) {
            Ext.Array.push(display_fields, [
                { text: 'Estimate', dataIndex: 'Estimate'},
                { text: 'To Do', dataIndex: 'ToDo'}
            ]);
        } else {
            display_fields.push({ text: 'Story Points', dataIndex: 'PlanEstimate'});
        }
        
        display_fields = Ext.Array.push(display_fields, [
            { text: 'Blocked', dataIndex: 'Blocked', renderer: function(value) {
                if ( value !== true ) {
                    return "No";
                }
                return "Yes";
            }},
            { text: 'Blocked Reason', dataIndex: 'BlockedReason'}, 
            { text: 'Color', dataIndex: 'DisplayColor', renderer: function(value) {
                if ( Ext.isEmpty(value) ) {
                    return '';
                }
                
                return "<div style='width:20px;height:20px;background-color:" + value + "'></div>";
            }}, 
            { text: 'Description', dataIndex: 'Description', renderer: function(value) {
                return "<div style='overflow:auto;height:150px;'>" + value + "</div>";
            } }
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
        container.add({
            xtype:'container',
            html: value,
            flex: 1,
            cls: 'ts-editor-field-contents',
            padding: 5,
            margin: 2
        });
        
        this.add( container );
    }
    
});