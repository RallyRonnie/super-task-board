Ext.define('CA.technicalservices.filter.AdvancedFilter',{
    extend: 'Ext.container.Container',
    alias: 'widget.tsadvancedfilter',
    
    layout: 'vbox',
    
    items: [
        {
            xtype           : 'rallybutton',
            itemId          : 'filterButton',
            cls             : 'secondary',
            text            : '<span class="icon-filter"> </span>',
            toolTipText     : 'Show Filters',
            _filterDisplay  : 'hidden'
        },
        { 
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype       : 'container',
                    itemId      : 'filterBox'
                },
                {
                    xtype       : 'container',
                    itemId      : 'selectorBox',
                    flex        : 1
                }
            ]
        }
    ],
    
    rows: [],
    filters: [],
    quickFilters: [],
    operator: 'and',
    
    config: {
        /**
         *  {Boolean} true to allow user to show/add advanced filter rows
         */
        allowAdvancedFilters: true,
        
        allowQuickFilters: true,
        
        model: 'UserStory'
    },

    /**
     * Gets the current state of the object. 
     * @return {Object} The current state
     */
    getState: function(){
        return { 
            filters: this._getFilterConfigs(),
            operator: this.operator,
            quickFilterMap: this._getQuickFilterConfig(),
            quickFilters: this.quickFilters
        };
    },
    
    constructor: function(config) {
        this.mergeConfig(config);
        this.callParent([this.config]);
        this._setButton();
        this.down('#filterButton').on('click', this._showHideFilters, this);
        if ( this.quickFilters && this.quickFilters.length > 0 ) {
            this.fireEvent('filterselected', this, this.quickFilters);
        }
    },

    initComponent: function() {
        this.callParent(arguments);

        this.addEvents(
            /**
             * @event filterselected
             * Fires when 
             * @param {CA.technicalservices.filter.AdvancedFilter} this the filter
             * @param {Rally.data.wsapi.Filter} wsapiFilter the filter selected
             */
            'filterselected'
        );
    },
    
    _showHideFilters: function(button) {
        if (button._filterDisplay == "visible" ) {
            button.toolTipText = 'Show Filters';
            button._filterDisplay = "hidden";
            this._hideFilters();
            return;
        } 
        button.toolTipText = 'Hide Filters';
        button._filterDisplay = "visible";
        this._showFilters();
    },
    
    _addRow: function(filter) {
        this.down('#filterBox').add({
            xtype:'tsadvancedfilterrow',
            filter: filter,
            listeners: {
                scope: this,
                rowadd: this._addRow,
                filterchanged: this._changeFilter
            }
        });
        
        this.rows = Ext.ComponentQuery.query('tsadvancedfilterrow');
    },
    
    _addQuickRow: function() {
        
        this.down('#filterBox').add({
            xtype:'tsadvancedfilterquickrow',
            initialValues: this.quickFilterMap,
            model: this.model,
            listeners: {
                scope: this,
                quickfilterchange: function(row, filters) {
                    console.log('filters:', filters);
                    this.quickFilters = filters;
                    this.quickFilterMap = this._getQuickFilterConfig();
                    this._setButton();
                    this.fireEvent('filterselected', this, filters);
                }
            }
        });
    },
    
    _showFilters: function() {
        var filter_box = this.down('#filterBox');
        filter_box.removeAll();
        
        if ( this.allowQuickFilters ) {
            this._addQuickRow();
        }
        
        if ( this.allowAdvancedFilters ) {
            if ( this.filters.length === 0 ) {
                this._addRow();
            } else {
                Ext.Array.each(this.filters, function(filter){
                    this._addRow(filter);
                }, this);
            }
            
            var selector_box = this.down('#selectorBox');
            selector_box.removeAll();
            var store = Ext.create('Rally.data.custom.Store',{
                data: [
                    {name:'All', value: 'and'},
                    {name:'Any', value: 'or'}
                ]
            });
            
            selector_box.add({
                xtype: 'rallycombobox',
                displayField: 'name',
                valueField: 'value',
                store: store,
                value: this.operator,
                listeners: {
                    scope: this,
                    change: function(cb) {
                        this.operator = cb.getValue();
                        this._setFilters();
                    }
                }
            });
        }
        
    },
    
    _hideFilters: function() {
        var filter_box = this.down('#filterBox');
        filter_box.removeAll();
        var selector_box = this.down('#selectorBox');
        selector_box.removeAll();
    },
    
    _changeFilter: function(row, filter) {
        this._setFilters();
    },
    
    _setFilters: function() {
        var me = this;
        
        this.filters = [];
        
        Ext.Array.each(this.rows, function(row) {
            var filter = row.getFilter();
            if ( Ext.isEmpty(filter) ) { return; }
            me.filters.push(filter);
        });
        
        var combined_filters = Rally.data.wsapi.Filter.and(this.filters);
        if ( this.operator == 'or' ) {
            combined_filters = Rally.data.wsapi.Filter.or(this.filters);
        }
        
        this.fireEvent('filterselected', this, combined_filters);
        this._setButton();
    },
    
    _setButton: function() {
        var button = this.down('#filterButton');
        
        if ( ( this.filters && this.filters.length > 0 ) || ( this.quickFilters && this.quickFilters.length > 0 ) ) {
            var count = this.filters && this.filters.length || 0;
            if ( count === 0 ) {
                count = this.quickFilters && this.quickFilters.length;
            }
            
            button.setText('<span class="icon-filter"> </span> (' + count + ')');
            button.addCls('reverse');
            return;
        }
        
        button.setText('<span class="icon-filter"> </span>');
        button.removeCls('reverse');
    },
    
    _getFilterConfigs: function() {
        return Ext.Array.map(this.filters, function(filter) {
            return filter.config;
        });
    },
    
    getFilters: function() {
        return this.quickFilters || [];
    },
    
    _getQuickFilterConfig: function() {
        var filter_map = {};
        Ext.Array.each(this.quickFilters, function(filter) {
            filter_map[filter.name] = filter;
        });
        return filter_map;
    }
    
});