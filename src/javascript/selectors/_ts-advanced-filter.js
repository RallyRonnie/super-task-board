Ext.define('CA.technicalservices.filter.AdvancedFilter',{
    extend: 'Ext.container.Container',
    alias: 'widget.tsadvancedfilter',
    
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
                    itemId      : 'filterBox',
                    margin      : 5,
                    padding     : 5,
                    flex        : 1
                },
                {
                    xtype       : 'container',
                    itemId      : 'selectorBox',
                    margin      : 5,
                    padding     : 5,
                    flex        : 1
                }
            ]
        }
    ],
    
    rows: [],
    filters: [],
    operator: 'and',
    
    config: {
        
    },

    /**
     * Gets the current state of the object. By default this function returns null,
     * it should be overridden in subclasses to implement methods for getting the state.
     * @return {Object} The current state
     */
    getState: function(){
        return { 
            filters: this._getFilterConfigs(),
            operator: this.operator
        };
    },
    

    constructor: function(config) {
        this.mergeConfig(config);
        this.callParent([this.config]);
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
        
        this.down('#filterButton').on('click', this._showHideFilters, this);
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
    
    _showFilters: function() {
        var filter_box = this.down('#filterBox');
        filter_box.removeAll();
        
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
        
        if ( this.filters && this.filters.length > 0 ) {
            button.setText('<span class="icon-filter"> </span> (' + this.filters.length + ')');
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
    }
    
});