Ext.define('Rally.technicalservices.sprintboard.TaskCard',{
    extend: 'Ext.Component',
    alias: 'widget.tstaskcard',
    
    config: {
       /**
         * @cfg {Rally.data.Model} (required)
         * The data store record that this card represents
         */
        record: undefined
    },
    
    constructor: function (config) {
        config = config || {};
        
        //console.log(Ext.getClass(config.record).superclass.self.getName());
        if ( config && config.record && !Ext.isEmpty( Ext.getClass(config.record) )) {
            config.record = config.record.getData();
        }
        
        this.mergeConfig(config);

        this.callParent([this.config]);
    },

    initComponent: function () {
        this.callParent();

//        this.addEvents(
//            
//        );
        
    },
    
    renderTpl: new Ext.XTemplate(
        '<tpl>',
            '<div id="T{$comp.record.ObjectID}" class="ts_task_card {$comp.record._type} {[this.getBlockedClass(values.$comp.record.Blocked)]}" style="{[this.getStyle(values.$comp.record)]}">',
                '{$comp.record.Name:ellipsis(45, true)}',
            '</div>',
        '</tpl>',
        {
            getStyle: function(record) {
                if (!Ext.isEmpty(record.DisplayColor)) {
                    return Ext.String.format("background-color:{0};color:white;",
                         record.DisplayColor
                     );
                }
                return "color:black;";
            },
            
            getBlockedClass: function(blocked) {
                if ( blocked !== true ) {
                    return "";
                }
                return "blocked";
            }
        }
    )
    
});