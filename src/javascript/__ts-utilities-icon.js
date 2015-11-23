Ext.define('Rally.technicalservices.IconUtility',{
    singleton: true,
    
    icons_by_type: { 
        'hierarchicalrequirement':'icon-story',
        'story': 'icon-story',
        'userstory': 'icon-story', 
        'defect':'icon-defect', 
        'task': 'icon-task',
        'testset': 'icon-test-set',
        'testcase': 'icon-test'
    },
        
    getIconForType: function(type_name) {
        return this.icons_by_type[type_name] || 'icon-cone';
    }
});