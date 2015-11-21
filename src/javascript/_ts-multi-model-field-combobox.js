/**
 * Makes a combobox of fields where only the fields shared by all the provided models are shown
 * 
 */
 
 Ext.define('Rally.technicalservices.MultiModelFieldComboBox', {
    requires: [],
    extend: 'Rally.ui.combobox.FieldComboBox',
    alias: 'widget.tsmultimodelfieldcombobox',

    config: {
        /**
         * @cfg [{Rally.data.Model/String}] model (required) The models containing the specified field used to populate the store.
         */
        models: []
    },
    constructor: function(config) {
        this.mergeConfig(config);

        this.store = Ext.create('Ext.data.Store', {
            fields: [this.valueField, this.displayField, 'fieldDefinition'],
            data: []
        });

        return this.callParent([this.config]);
    },

    initComponent: function() {
        this.callParent(arguments);

        if (!Ext.isEmpty(this.models) ) {
            if (Ext.isString(this.models)) {
                this.models = this.models.split(',');
            }
            this._fetchModels();
        }
    },
    
    _fetchSpecificModel: function(model){
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            context: this.context,
            type: model,
            success: function(m) {
                deferred.resolve(m);
            },
            scope: this
        });
        
        return deferred.promise;
    },
    
    _fetchModels: function() {
        var promises = [];
        var me = this;
        
        Ext.Array.each(this.models, function(model){
            promises.push(function() {
                return me._fetchSpecificModel(model);
            });
        }, this);
       
        Deft.Chain.sequence(promises).then({
            scope: this,
            success: this._onModelsRetrieved,
            failure: function(msg) {
                Ext.Msg.alert("Couldn't retrieve model", msg);
            }
        });
    },

    _onModelsRetrieved: function(models) {
        this.models = models;
        this._populateStore();
    },
    
    _populateStore: function() {
        if (!this.store) {
            return;
        }
                
        var data = [];
        var fields_array = [];
        
        Ext.Array.each(this.models, function(model) {
            fields_array.push( Ext.Array.filter(model.getFields(), this._isNotHidden, this) );
        },this);
        
        console.log('fields_array', fields_array);
        
        data = this._getSharedPairs(fields_array);
        
        //data = _.sortBy(data,'name');
        
        console.log('data',data);

        this.store.loadRawData(data);
        this.setDefaultValue();
        this.onReady();
    },
    
    _getSharedPairs: function(array_of_fields_for_all_models){
        var calculations = {};
        
        Ext.Array.each(array_of_fields_for_all_models, function(array_of_fields_in_one_model){
            
            Ext.Array.each(array_of_fields_in_one_model, function(field){
                if ( Ext.isEmpty(calculations[field.name]) ) {
                    calculations[field.name] = {
                        field: field,
                        count: 0
                    };
                }
                
                if ( calculations[field.name].field.displayName == field.displayName ) {
                    calculations[field.name].count += 1;
                }
            });
        });
        
        var number_of_models = array_of_fields_for_all_models.length;
        
        var data = Ext.Array.pluck( 
            Ext.Array.filter(Ext.Object.getValues(calculations), function(calculation){
                return calculation.count == number_of_models;
            }), 
            'field'
        );
        
        return Ext.Array.map(data,function(field){
            return this._convertFieldToLabelValuePair(field);
        },this);
    }
});