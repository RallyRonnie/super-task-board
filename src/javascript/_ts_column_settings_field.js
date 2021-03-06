/**
 * Allows configuration of task state mapping for kanban columns
 *
 *      @example
 *      Ext.create('Ext.Container', {
 *          items: [{
 *              xtype: 'tscolumnsettingsfield',
 *              value: {}
 *          }],
 *          renderTo: Ext.getBody().dom
 *      });
 *
 */
Ext.define('Rally.technicalservices.ColumnSettingsField', {
    extend: 'Ext.form.field.Base',
    alias: 'widget.tscolumnsettingsfield',
    plugins: ['rallyfieldvalidationui'],
    requires: [
        'Rally.ui.combobox.ComboBox',
        'Rally.ui.TextField',
        'Rally.ui.combobox.FieldValueComboBox',
        'Rally.ui.plugin.FieldValidationUi'
    ],

    fieldSubTpl: '<div id="{id}" class="settings-grid"></div>',

    width: 600,
    cls: 'column-settings',

    config: {
        /**
         * @cfg {Object}
         *
         * The column settings value for this field
         */
        value: undefined,

        defaultCardFields: ''
    },

    onDestroy: function() {
        if (this._grid) {
            this._grid.destroy();
            delete this._grid;
        }
        this.callParent(arguments);
    },

    onRender: function() {
        this.callParent(arguments);

        this._store = Ext.create('Ext.data.Store', {
            fields: ['column', 'shown', 'stateMapping' ],
            data: []
        });

        this._grid = Ext.create('Rally.ui.grid.Grid', {
            autoWidth: true,
            renderTo: this.inputEl,
            columnCfgs: this._getColumnCfgs(),
            showPagingToolbar: false,
            showRowActionsColumn: false,
            enableRanking: false,
            store: this._store,
            editingConfig: {
                publishMessages: false
            }
        });
    },

    _getColumnCfgs: function() {
        var columns = [
            {
                text: 'Column',
                dataIndex: 'column',
                emptyCellText: 'None',
                flex: 2
            },
            {
                text: 'Show',
                dataIndex: 'shown',
                flex: 1,
                renderer: function (value) {
                    return value === true ? 'Yes' : 'No';
                },
                editor: {
                    xtype: 'rallycombobox',
                    displayField: 'name',
                    valueField: 'value',
                    editable: false,
                    storeType: 'Ext.data.Store',
                    storeConfig: {
                        remoteFilter: false,
                        fields: ['name', 'value'],
                        data: [
                            {'name': 'Yes', 'value': true},
                            {'name': 'No', 'value': false}
                        ]
                    }
                }
            },
            {
                text: 'State Mapping',
                dataIndex: 'stateMapping',
                emptyCellText: '--No Mapping--',
                flex: 2,
                editor: {
                    xtype: 'rallyfieldvaluecombobox',
                    model: Ext.identityFn('Task'),
                    field: 'State',
                    listeners: {
                        ready: function (combo) {
                            var noMapping = {};
                            noMapping[combo.displayField] = '--No Mapping--';
                            noMapping[combo.valueField] = '';

                            combo.store.insert(0, [noMapping]);
                        }
                    }
                }
            }
        ];

        return columns;
    },

    /**
     * When a form asks for the data this field represents,
     * give it the name of this field and the ref of the selected project (or an empty string).
     * Used when persisting the value of this field.
     * @return {Object}
     */
    getSubmitData: function() {
        var data = {};
        data[this.name] = Ext.JSON.encode(this._buildSettingValue());
        return data;
    },

    _buildSettingValue: function() {
        var columns = {};
        this._store.each(function(record) {
            if (record.get('shown')) {
                columns[record.get('column')] = {
                    stateMapping: record.get('stateMapping')
                };
                
            }
        }, this);
        return columns;
    },

    getErrors: function() {
        var errors = [];
//        if (this._storeLoaded && !Ext.Object.getSize(this._buildSettingValue())) {
//            errors.push('At least one column must be shown.');
//        }
        return errors;
    },

    setValue: function(value) {
        this.callParent(arguments);
        this._value = value;
    },

    _getColumnValue: function(columnName) {
        var value = this._value;
        return value && Ext.JSON.decode(value)[columnName];
    },

    refreshWithNewField: function(field) {
        delete this._storeLoaded;
        field.getAllowedValueStore().load({
            callback: function(records, operation, success) {
                var data = Ext.Array.map(records, this._recordToGridRow, this);
                this._store.loadRawData(data);
                this.fireEvent('ready');
                this._storeLoaded = true;
            },
            scope: this
        });
    },

    _recordToGridRow: function(allowedValue) {
        var columnName = allowedValue.get('StringValue');
        var pref = this._store.getCount() === 0 ? this._getColumnValue(columnName) : null;

        var column = {
            column: columnName,
            shown: false,
            stateMapping: ''
        };

        if (pref) {
            Ext.apply(column, {
                shown: true,
                stateMapping: pref.stateMapping
            });

        }

        return column;

    }
});
