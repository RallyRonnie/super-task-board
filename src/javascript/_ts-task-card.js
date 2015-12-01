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
    
//     '<tpl if="this.hasColor(DisplayColor)">',
//                "<div id='T{record.ObjectID}' class='ts_task_card {record._type} {[this.getBlockedClass(values.record.Blocked)]}' style='background-color:{record.DisplayColor};color:white;'>",
//            '<tpl else>',
//                "<div  id='T{record.ObjectID}'  class='ts_task_card {record_type} {[this.getBlockedClass(values.record.Blocked)]}' style='color:black;'>",
//            '</tpl>',
//        
//            "{record.Name:ellipsis(15, true)}</div>",
    renderTpl: new Ext.XTemplate(
        '<tpl if="this.hasColor($comp.record.DisplayColor)">',
            '<div class="ts_task_card {$comp.record._type} {[this.getBlockedClass(values.$comp.record.Blocked)]}" style="{[this.getStyle(values.$comp.record)]}">',
                '{$comp.record.Name:ellipsis(15, true)}',
            '</div>',
        '</tpl>',
        {
            hasColor: function(color){
                return !Ext.isEmpty(color);
            },
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