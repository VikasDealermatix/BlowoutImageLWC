import { LightningElement, api, wire } from 'lwc';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getFieldsByFieldSetName from '@salesforce/apex/MetadataController.getFieldsByFieldSetName';
import { CurrentPageReference } from 'lightning/navigation';
import { publish, MessageContext } from 'lightning/messageService';
import FORCEREFRESHMC from '@salesforce/messageChannel/ForceReset__c';

export default class RecordPanel extends LightningElement {
    @api title;
    @api objectApiName;
    @api layoutType;
    @api viewMode;
    @api recordFieldsetName;
    @api hideSubmit;
    recordId;
    privateDefaultFieldValues;
    currentPageReference = null;
    urlStateParameters = null;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.urlStateParameters = currentPageReference.state;
            this.setParametersBasedOnUrl();
        }
    }
    
    @wire(MessageContext)
    messageContext;

    setParametersBasedOnUrl() {
        if (this.urlStateParameters.dmpl__ParterAccountId__c) {
            this.setDefaultValue('dmpl__ParterAccountId__c', this.urlStateParameters.dmpl__ParterAccountId__c, true);
        }
        if (this.urlStateParameters.dmpl__BranchId__c) {
            this.setDefaultValue('dmpl__BranchId__c', this.urlStateParameters.dmpl__BranchId__c, true);
        }
        if (this.urlStateParameters.dmpl__AccountId__c) {
            this.setDefaultValue('dmpl__AccountId__c', this.urlStateParameters.dmpl__AccountId__c, true);
        }
        if (this.urlStateParameters.AccountId) {
            this.setDefaultValue('dmpl__AccountId__c', this.urlStateParameters.AccountId, true);
        }
    }

    @api
    get defaultFieldValues() {
        return this.privateDefaultFieldValues;
    }
    set defaultFieldValues(value) {
        this.privateDefaultFieldValues = value;
        this.setAttribute('defaultFieldValues', this.privateDefaultFieldValues);
        this.populateDefaultValues();
    }

    @wire(getFieldsByFieldSetName, { objectApiName: '$objectApiName', fieldSetName: '$recordFieldsetName' })
    fieldsetFields;

    get getFieldsetFields() {
        if (this.fieldsetFields && this.fieldsetFields.data) {
            return this.fieldsetFields.data;
        }
    }

    get isLoaded() {
        return (this.fieldsetFields.data || this.fieldsetFields.error);
    }

    get isSubmitDisabled() {
        return (!this.fieldsetFields);
    }

    populateDefaultValues(fireChange) {
        if (!this.privateDefaultFieldValues) {
            return;
        }
        this.privateDefaultFieldValues.split(',').forEach(p => {
            if (p) {
                const nvPair = p.split("|");
                if (nvPair.length == 2) {
                    this.setDefaultValue(nvPair[0], nvPair[1], fireChange);
                }
            }
        }
        );
    }

    setDefaultValue(name, value, fireChange) {
        const inputFields = this.template.querySelectorAll(
            'lightning-input-field'
        );
        if (inputFields) {
            inputFields.forEach(field => {
                if (field.fieldName == name
                    && field.value != value) {
                    field.value = value == "true"?true:value=="false"?false:value;
                    if (fireChange) {
                        this.fireChangeEvent(name, value);
                    }
                    return;
                }
            });
        }
    }

    async handleSuccess(event) {
        this.recordId = event.detail ? event.detail.id : undefined;
        var messsage = this.recordId ? `Document \'${this.recordId}\' created successfully.` : 'Record created successfully.';
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: messsage,
                variant: 'success',
            }),
        );
        this.fireForceRefreshEvent();
        this.handleReset();
        refreshApex(this.recordId);
        getRecordNotifyChange(new Array({ "recordId": this.recordId }));
        eval("$A.get('e.force:refreshView').fire();");
        this.fireSavedEvent();
    }

    @api
    invokeSave(){
        const btn = this.template.querySelector("lightning-button");
        if(btn){ 
           btn.click();
        }
    }

    handleLoad() {
        this.populateDefaultValues(true);
    }

    handleError(event) {
        console.log(event.detail);
    }

    handleReset() {
        const inputFields = this.template.querySelectorAll(
            'lightning-input-field'
        );
        const fsField = this.getFieldsetFields && this.getFieldsetFields.length > 0 ? this.getFieldsetFields[0] : undefined;
        if (inputFields) {
            inputFields.forEach(field => {
                field.reset();
            });
        }
    }

    handleFieldChange(event) {
        if ((!event.target) || (!event.target.id))
            return;
        const target = event.target.id.slice(0, event.target.id.lastIndexOf('-'));
        var value = undefined;
        if (event.detail.value) {
            if (Array.isArray(event.detail.value) && Array.from(event.detail.value).length > 0) {
                value = event.detail.value[0];
            } else if (!(typeof event.detail.value === 'object')) {
                value = event.detail.value;
            }
        } else if ('checked' in event.detail) {
            value = event.detail.checked;
        }
        this.fireChangeEvent(target, value);
    }

    fireChangeEvent(name, value) {
        const filters = {
            name: name,
            value: value
        };
        this.dispatchEvent(new CustomEvent('valuechanged', { "detail": filters }));
    }
    
    fireSavedEvent() {
        const filters = {
            Id: this.recordId
        };
        this.dispatchEvent(new CustomEvent('recordsaved', { "detail": filters }));
    }

    fireForceRefreshEvent() {
        const filters = {
            recordApiName: this.objectApiName,
            recordApiId: this.recordId,
            state: '',
        };
        publish(this.messageContext, FORCEREFRESHMC, filters);
    }
}