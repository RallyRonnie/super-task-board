Ext.define('CA.technicalservices.filter.AdvancedFilterRow',{
    extend: 'Ext.container.Container',
    alias: 'widget.tsadvancedfilterrow',
    
    layout: 'hbox',
    
    items: [
        {
            xtype       : 'rallybutton',
            itemId      : 'addButton',
            cls         : 'secondary rly-small icon-plus',
            margin      : '3px 0px 0px 3px',
            disabled    : false,
            text        : ' '
        },
        {
            xtype       : 'rallybutton',
            itemId      : 'removeButton',
            cls         : 'secondary rly-small icon-minus',
            margin      : '3px 3px 0px 0px',
            text        : ' '
        },
        {
            xtype  : 'container',
            itemId : 'filterFieldBox'
        },
        {
            xtype  : 'container',
            itemId : 'filterOperatorBox'
        },
        {
            xtype  : 'container',
            itemId : 'filterOperatorBox'
        },
        {
            xtype  : 'container',
            itemId : 'filterValueBox'
        },
        {
            xtype  : 'container',
            flex   : 1
        },
        { 
            xtype  : 'container',
            itemId : 'filterMatchBox'
        },
        {
            xtype  : 'container',
            itemId : 'filterClearBox'
        }
    ],
    
    config: {
        model: 'UserStory',
        
        filter: null
        
    },

    constructor: function(config) {
        this.mergeConfig(config);
        this.callParent([this.config]);
    },

    initComponent: function() {
        this.callParent(arguments);
        
        this.addEvents(
            /**
             * @event rowadd
             * Fires when row add button is pushed
             * @param {CA.technicalservices.filter.AdvancedFilterRow} this the filter
             */
            'rowadd',
            
            /**
             * @event filterchanged
             * Fires when filter has field + operator + value selected
             * @param {CA.technicalservices.filter.AdvancedFilterRow} this the filter
             * @param {Rally.data.wsapi.Filter} wsapiFilter the filter selected
             */
            'filterchanged',
            
            /**
             * @event filterremoved
             * Fires when a filter is cleared
             * @param {CA.technicalservices.filter.AdvancedFilterRow} this the empty row
             */
            'filterremoved'
        );
        
        
        this.down('#addButton').on('click', this._requestAdd, this);
        this.down('#removeButton').on('click', this.clearFilters, this);
        
        if ( Ext.isString(this.model) ) {
            this._getModel(this.model).then({
                scope: this,
                success: function(model) {
                    this.model = model;
                    this._displaySelectors();
                },
                failure: function(msg) {
                    Ext.Msg.alert("Problem loading model for filter", msg);
                }
            });
        } else {
            this._displaySelectors();
        }
    },
    
    _requestAdd: function() {
        //this.down('#addButton').setDisabled(true);
        this.fireEvent('rowadd');
    },
    
    _getModel: function(model_name) {
        var deferred = Ext.create('Deft.Deferred');
        
        Rally.data.ModelFactory.getModel({
            type: model_name,
            success: function(model) {
                deferred.resolve(model);
            },
            failure: function(msg) {
                deferred.reject(msg);
            }
        });
        return deferred.promise;
    },
    
    _displaySelectors: function() {
        this._addFieldSelector();
        this._addOperatorSelector();
    },
    
    _addFieldSelector: function() {
        var container = this.down('#filterFieldBox');
        container.removeAll();
        
        var value = null;
        if (! Ext.isEmpty(this.filter) ) {
            value = this.filter.config && this.filter.config.property || this.filter.property;
        }
        container.add({
            xtype: 'rallyfieldcombobox',
            itemId: 'fieldCombobox',
            model: this.model,
            value: value,
            _isNotHidden: this._allowFieldInDropDown,
            listeners: {
                scope: this,
                change: function(cb) {
                    this._addOperatorSelector(cb);
                }
            }
        });
    },
    
    _allowFieldInDropDown: function(field) {
        if ( field.hidden ) { 
            return false;
        }
        var blacklist = ["PredecessorsAndSuccessors","ObjectUUID","VersionId", "DragAndDropRank",
            "Attachments", "Tasks", "TestCases", "Predecessors", "Successors", "Tags", "Changesets",
            "Children", "Defects", "Discussion", "Milestones",
            "Feature",  "PortfolioItem", "Parent", "Subscription", "Project"];
    
        if ( Ext.Array.contains(blacklist, field.name) ) {
            return false;
        }
        
        var attributeDefn = field.attributeDefinition;
        
        if ( attributeDefn ) {
            if ( !attributeDefn.Filterable ) {
                return false;
            }
        }
        return true;
    },
    
    _addOperatorSelector: function() {
        var container = this.down('#filterOperatorBox');
        container.removeAll();
        var store = Ext.create('Ext.data.Store', {
            fields: ['name', 'displayName']
        });
        
        var field_selector = this.down('#fieldCombobox');
        var disabled = true;
        
        if ( !Ext.isEmpty(field_selector) ) {
            var field_name = field_selector.getValue();
            if ( ! Ext.isEmpty(field_name) ) {
                var field = this.model.getField(field_name);
               
                var store = field.getAllowedQueryOperatorStore();
                store.load();
                disabled = false;
            }
        }
        
        var value = null;
        if (! Ext.isEmpty(this.filter) ) {
            value = this.filter.config && this.filter.config.operator || this.filter.operator;
        }
        
        container.add({
            xtype: 'rallycombobox',
            itemId: 'operatorCombobox',
            disabled: disabled,
            autoLoad: false,
            value: value,
            editable: false,
            forceSelection: true,
            store: store,
            displayField: 'OperatorName',
            valueField: 'OperatorName',
            matchFieldWidth: true,
            listeners: {
                scope : this,
                change: this._createFilter,
                ready : this._addValueSelector
            }
        });
    },
    
    _addValueSelector: function(cb) {
        var container = this.down('#filterValueBox');
        container.removeAll();
        
        var editor = {
            xtype: 'rallytextfield',
            disabled: true,
            autoLoad: false,
            editable: false,
            forceSelection: true,
            matchFieldWidth: true
        };
        
        var field_selector = this.down('#fieldCombobox');
        
        if ( !Ext.isEmpty(field_selector) ) {
            var field_name = field_selector.getValue();
            if ( ! Ext.isEmpty(field_name) ) {
                if ( field_name == "ScheduleState" ) {
                    editor = this._getScheduleStateEditor();
                } else {
                    var field = this.model.getField(field_name);
                    editor = Rally.ui.renderer.GridEditorFactory.getEditor(field);
                }
            }
           
            
            if ( editor.xtype == "rallytextfield" ) {
                editor.height = 22;
            }
            
            if ( /editor/.test(editor.xtype) ) {
                editor = this._useModifiedEditor(editor,field);
            }
            
            editor.listeners = {
                scope : this,
                change: this._createFilter
            }
            
            if ( editor.xtype == 'rallycombobox' ) {
                editor.allowNoEntry = true;
            }
            editor.itemId = 'valueCombobox';
            
            var value_field = container.add(editor);
            
            if (! Ext.isEmpty(this.filter) ) {
                value = this.filter.config && this.filter.config.value || this.filter.value;
                value_field.setValue(value);
            }
        }
    },
    
    _useModifiedEditor: function(editor, field) {
        var editor_config = editor.field;
        if ( editor_config.xtype == 'rallyfieldvaluecombobox' ) {
            editor_config.model = this.model.elementName;
            editor_config.field = field.name;
        }
        
        if ( editor_config.xtype == 'rallyiterationcombobox'  || editor_config.xtype == 'rallyreleasecombobox') {
            editor_config.defaultToCurrentTimebox = true;
            delete editor_config.storeConfig;
        }
        
        return editor_config;
    },
    
    _getScheduleStateEditor: function() {
        return {
            xtype: 'rallyfieldvaluecombobox',
            model: this.model,
            field: 'ScheduleState'
        };
    },
    
    _createFilter: function() {
        var field_selector    = this.down('#fieldCombobox');
        var operator_selector = this.down('#operatorCombobox');
        var value_selector    = this.down('#valueCombobox');
        
        if ( Ext.isEmpty(field_selector) || Ext.isEmpty(operator_selector) || Ext.isEmpty(value_selector) ) {
            return;
        }
        
        var property = field_selector.getValue();
        var operator = operator_selector.getValue();
        var value = value_selector.getValue();
        this.filter = null;
        if ( !Ext.isEmpty(property) && !Ext.isEmpty(operator) ) {
            this.filter = Ext.create('Rally.data.wsapi.Filter',{ property: property, operator: operator, value: value });
        }
        this.fireEvent('filterchanged', this, this.filter);
        //this.down('#addButton').setDisabled(false);
    },
    
    clearFilters: function() {
        var field_selector    = this.down('#fieldCombobox');
        var operator_selector = this.down('#operatorCombobox');
        var value_selector    = this.down('#valueCombobox');
        
        value_selector.setValue(null);
        field_selector.setValue(null);
        this.filter = null;
        
        this.fireEvent('filterremoved',this);
        this.fireEvent('filterchanged',this, null);
        //this.down('#addButton').setDisabled(true);
    },
    
    getFilter: function() {
        return this.filter;
    }
    
});