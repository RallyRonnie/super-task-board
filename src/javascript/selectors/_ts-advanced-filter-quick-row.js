Ext.define('CA.technicalservices.filter.AdvancedFilterQuickRow',{
    extend: 'Ext.container.Container',
    alias: 'widget.tsadvancedfilterquickrow',
    
    layout: 'hbox',
    
    items: [
        {
            xtype: 'container',
            itemId: 'filter_box',
            flex: 1,
            layout: 'hbox',
            padding: '0 5 5 0',
            margin: '0 5 5 0',
            defaults: {
                margin: '0 5 5 0',
                padding: '0 5 5 0'
            }
        },
        {
            xtype:'container',
            margin: 15,
            items: [
                {
                    xtype       : 'rallybutton',
                    itemId      : 'add_button',
                    disabled    : false,
                    text        : '+ Add Filter'
                }
            ]
        }
    ],
    
    config: {
        model: 'UserStory',
        filter: null,
        addQuickFilterConfig: {
            whiteListFields: ['ArtifactSearch']
        },
        fields: [],
        initialValues: {}
    },

    initComponent: function() {
        this.callParent(arguments);
        
        this.addEvents(
            /**
             * @event filteradd
             * Fires when a new filter box is added
             * @param {CA.technicalservices.filter.AdvancedFilterQuickRow} this the quick filter row
             * @param {} the filter box
             */
            'filteradd',
            
            /**
             * @event quickfilterchange
             * @param {CA.technicalservices.filter.AdvancedFilterQuickRow} this the quick filter row
             * @param [{Rally.data.wsapi.Filter}] wsapiFilters the filters selected
             */
            'quickfilterchange'
        );

        this.down('#add_button').on('click', this._showQuickFilterPopover, this);
//        
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
    
    _displaySelectors: function() {
        var model = this.model,
            me = this;
            
        console.log("--", this.initialValues);
        Ext.Array.each(Ext.Object.getKeys(this.initialValues), function(field_name, idx){
            var newItem = me._createField(idx+1, field_name, me.initialValues);
            me.fields.push(newItem);
            me.down('#filter_box').insert(idx+1, newItem);
        });

    },
    
    _changeFieldValue: function(field) {
        this.fireEvent('quickfilterchange', this, this.getFilters());
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
    
    _showQuickFilterPopover: function(button) {
        var addQuickFilterConfig = Ext.clone(this.addQuickFilterConfig);
            var blackList =  _.map(this.fields, 'name');
            
            if (addQuickFilterConfig && addQuickFilterConfig.whiteListFields) {
                addQuickFilterConfig.whiteListFields = _.reject(this.addQuickFilterConfig.whiteListFields, function(field){
                    return _.contains(blackList, field);
                });
            }
            
            this.addQuickFilterPopover = Ext.create('Rally.ui.popover.FieldPopover', {
                target: button.getEl(),
                placement: ['bottom', 'top', 'left', 'right'],
                fieldComboBoxConfig: _.merge({
                    model: this.model,
                    context: this.context || Rally.getApp().getContext(),
                    emptyText: 'Search filters...',
                    additionalFields: [
                        {
                            name: 'ArtifactSearch',
                            displayName: 'Search'
                        }
                    ],
                    blackListFields: blackList,
//                    _getModelNamesForDuplicates: function(field, fields) {
//                        var fieldCounts = _.countBy(fields, 'displayName');
//                        
//                        // TODO figure out what to do about using multiple record types
////                        if (fieldCounts[field.displayName] > 1) {
////                            return _.pluck(this.model.getModelsForField(field), 'displayName').join(', ');
////                        }
//                        return '';
//                    },
                    listeners: {
                        select: function(field, value) {
                            var fieldSelected = value[0].raw;
                            
                            this.addQuickFilterPopover.close();
                            this._onAddQuickFilterSelect(fieldSelected);
                        },
                        destroy: function(){
                            delete this.addQuickFilterPopover;
                        },
                        scope: this
                    }
                }, addQuickFilterConfig, function(a, b) {
                    if (_.isArray(a)) {
                        return a.concat(b);
                    }
                })
            });
    },

    _onAddQuickFilterSelect: function(field) {
        var index = this.fields.length;
        var newItem = this._createField(index + 1, field);
        this.fields.push(newItem);
        this.down('#filter_box').insert(index, newItem);
    },


    _createField: function(filterIndex, field, initialValues) {
        var fieldName = field.name || field,
            modelField = this.model.getField(fieldName),
            fieldConfig = Rally.ui.inlinefilter.FilterFieldFactory.getFieldConfig(this.model, fieldName, this.context),
            initialValue = initialValues && initialValues[fieldConfig.name] && initialValues[fieldConfig.name].rawValue;

        if (modelField && modelField.isDate() && initialValue) {
            initialValue = Rally.util.DateTime.fromIsoString(initialValue);
        }

        initialValue = Rally.ui.inlinefilter.FilterFieldFactory.getInitialValueForLegacyFilter(fieldConfig, initialValue);
        fieldConfig = Rally.ui.inlinefilter.FilterFieldFactory.getFieldConfigForLegacyFilter(fieldConfig, initialValue);

        Ext.applyIf(fieldConfig, {
            allowClear: true
        });
        
        Ext.merge(fieldConfig, {
            autoExpand: this.autoExpand,
            allowBlank: true,
            clearText: '-- Clear Filter --',
            hideLabel: false,
            beforeLabelTextTpl: [
                '<span class="filter-index">{[this.getFilterIndex()]}</span>',
                {
                    filterIndex: filterIndex,
                    displayIndex: this.isCustomMatchType(),
                    getFilterIndex: function() {
                        return this.displayIndex ? Ext.String.format('({0}) ', this.filterIndex) : '';
                    }
                }
            ],
            fieldLabel: '<span class="remove-quick-filter-icon icon-cross"></span>',
            labelAlign: 'top',
            labelSeparator: '',
            enableKeyEvents: true,
            margin: '0 5 0 0',
            cls: this.isCustomMatchType() ? 'indexed-field' : '',
            model: this.model,
            context: this.context,
            operator: this._getOperatorForModelField(modelField),
            //afterSubTpl: ' <span class="remove-quick-filter-icon icon-cross"></span>',
            renderSelectors: {
                removeIcon: '.remove-quick-filter-icon'
            },
            listeners: {
                afterrender: function (field) {
                    field.removeIcon.on('click', _.partial(this._removeQuickFilter, field), this);
                },
                change: this._changeFieldValue,
                scope: this
            }
        });

        if (!_.isUndefined(initialValue)) {
            Ext.merge(fieldConfig, {
                value: initialValue
            });
        }

        if (_.isPlainObject(field)) {
            Ext.apply(fieldConfig, field);
        }

        if (filterIndex === 1) {
            fieldConfig.itemId = this.self.FOCUS_CMP_ITEM_ID;
        }

        if (this._shouldApplyFiltersOnSelect(fieldConfig)) {
            Ext.merge(fieldConfig, {
                autoSelect: true,
                listeners: {
                    //select: this._applyFilters,
                    scope: this
                }
            });
        } else {
            Ext.merge(fieldConfig, {
                listeners: {
                    //change: this._applyFilters,
                    scope: this
                }
            });
        }
        
        if ( fieldConfig.xtype == "rallytextfield" || fieldConfig.xtype == 'rallyartifactsearchfield') {
            fieldConfig.height = 27;
            fieldConfig.margin = '2 5 25 0';
        }

        return Ext.widget(fieldConfig);
    },
    
    isCustomMatchType: function() {
        return this.matchType === 'CUSTOM';
    },

    _getOperatorForModelField: function(modelField) {
        var operator = '=';

        if (modelField && modelField.isCollection && modelField.isCollection()) {
            operator = 'contains';
        }

        return operator;
    },
    
    _removeQuickFilter: function(field) {
        var arrayIndex = field.beforeLabelTextTpl.filterIndex - 1;
        this.fields[arrayIndex] && this.fields[arrayIndex].destroy();
        this.fields.splice(arrayIndex, 1);
        this.updateFilterIndices();
        this.fireEvent('quickfilterchange', this, this.getFilters());

    },
    
    updateFilterIndices: function(matchType) {
        this.matchType = matchType || this.matchType;

        _.each(this.fields, function (field, index) {
            field.beforeLabelTextTpl.displayIndex = this.isCustomMatchType();
            field.beforeLabelTextTpl.filterIndex = index + 1;
            field.beforeLabelTextTpl.overwrite(field.labelEl.down('.filter-index'));
            if (this.isCustomMatchType()) {
                field.addCls('indexed-field');
            } else {
                field.removeCls('indexed-field');
            }
            if (Ext.isIE10m && field.inputEl) {
                field.setValue(field.getValue());
            }
        }, this);
    },

    _shouldApplyFiltersOnSelect: function(fieldConfig) {
        var field = this.model.getField(fieldConfig.name),
            attributeDefinition = field && field.attributeDefinition;

        return attributeDefinition &&
            (attributeDefinition.Constrained || attributeDefinition.AttributeType === 'OBJECT') &&
            !fieldConfig.multiSelect;
    },

    getFilters: function() {
        var filters = [];
        _.each(this.fields, function(field, index) {
            if (field.name === 'ModelType') {
                return;
            }

            if (!Ext.isEmpty(field.lastValue) && !field.hasActiveError()) {

                var lastValue = field.lastValue;

                var isRefUri = Rally.util.Ref.isRefUri(lastValue);
                var isRefOid = _.isNumber(Rally.util.Ref.getOidFromRef(lastValue));
                if (isRefUri && isRefOid && field.valueField === '_ref' && field.noEntryValue !== lastValue) {
                    var record = field.getRecord();
                    if (record) {
                        var uuidRef = record.get('_uuidRef');
                        if (uuidRef) {
                            lastValue = uuidRef;
                        }
                    }
                }

                var filter = _.isFunction(field.getFilter) ? field.getFilter() : Rally.data.wsapi.Filter.fromExtFilter({
                    property: field.name,
                    operator: field.operator,
                    value: lastValue
                });

                if(filter) {

                    if (field.allowNoEntry && field.noEntryValue === lastValue) {
                        filter.value = null;
                    }

                    Ext.apply(filter, {
                        name: field.name,
                        rawValue: lastValue,
                        filterIndex: index + 1
                    });

                    filters.push(filter);
                }
            }
        }, this);
        
        var filter_hash = {};
        Ext.Array.each(filters, function(filter){ filter_hash[filter.name] = filter; });
        
        return Ext.Object.getValues(filter_hash);
    }
});