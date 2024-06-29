import { LightningElement, track, api, wire } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getItemComponentsByItemId from '@salesforce/apex/ProductCatalogController.getItemComponentsByItemId';
import getItemsByName from '@salesforce/apex/ProductCatalogController.getItemsByName';

import SALE_ORDER_LINE_OBJECT from '@salesforce/schema/dmpl__SaleOrderLine__c';
import DMPL_SALE_ORDER_ID_FIELD from '@salesforce/schema/dmpl__SaleOrderLine__c.dmpl__SaleOrderId__c';
import DMPL_ITEM_ID_FIELD from '@salesforce/schema/dmpl__SaleOrderLine__c.dmpl__ItemId__c';
import DMPL_ITEM_QUANTITY_FIELD from '@salesforce/schema/dmpl__SaleOrderLine__c.dmpl__Quantity__c';
import DMPL_UNIT_COST_FIELD from '@salesforce/schema/dmpl__SaleOrderLine__c.dmpl__UnitPrice__c';


import REPAIR_ORDER_LINE_OBJECT from '@salesforce/schema/dmpl__RepairOrderLine__c';
import DMPL_REPAIR_ORDER_ID_FIELD from '@salesforce/schema/dmpl__RepairOrderLine__c.dmpl__RepairOrderId__c';
import DMPL_REPAIR_ITEM_ID_FIELD from '@salesforce/schema/dmpl__RepairOrderLine__c.dmpl__ItemId__c';
import DMPL_REPAIR_ITEM_QUANTITY_FIELD from '@salesforce/schema/dmpl__RepairOrderLine__c.dmpl__Quantity__c';

export default class ProductCatalogView extends LightningElement {
    @track selectedItem;
    @track otherItems = [];
    originalWidth;
    originalHeight;
    @api recordId;

    @api objectApiName;
    @track searchKey = '';
    @track items;
    @track selectedItem1;
    @track selectedItemComponents;
    @track showImageAndButtons = false; 

    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo;
   
    get objectLabel() {
        return this.objectInfo?.data?.label || 'Object';
    }
 
    handleSearchKeyChange(event) {
        this.searchKey = event.target.value;
        console.log('Search key changed:', this.searchKey);
        this.handleSearch();
    }
    
    clearNumbers() {
        const numberContainer = this.template.querySelector('.number-container');
        if (numberContainer) {
            numberContainer.innerHTML = '';
        }
    }

    handleSearch() {
        getItemsByName({ itemName: this.searchKey })
            .then(result => {
                console.log('Search results:', result);
                this.items = result;
                if (result.length > 0) {
                    this.selectedItem = result[0];
                    this.fetchItemComponents(result[0].Id);
                    this.clearNumbers();
                } else {
                    this.selectedItem = null;
                    this.selectedItemComponents = null;
                    this.otherItems = []; 
                    this.clearNumbers();
                }
            })
            .catch(error => {
                console.error('Error fetching items:', error);
                this.items = null;
                this.clearNumbers();
            });
    }
    
    handleItemClick(event) {
        const itemId = event.currentTarget.dataset.id;
        console.log('Item clicked:', itemId);
        this.selectedItem = this.items.find(item => item.Id === itemId);
        this.searchKey = this.selectedItem.Name;
        this.fetchItemDetails(itemId);
    }

    fetchItemComponents(itemId) {
        getItemComponentsByItemId({ itemId })
            .then(result => {
                console.log('Item components:', result);
                this.selectedItemComponents = result;
            })
            .catch(error => {
                console.error('Error fetching item components:', error);
                this.selectedItemComponents = null;
            });
    }

    fetchItemDetails(itemId) {
        getItemComponentsByItemId({ itemId })
            .then(result => {
                if (result && result.length > 0) {
                    this.selectedItem = {
                        Id: result[0].Id,
                        Name: result[0].name,
                        ImageUrl__c: result[0].imageUrl,
                        coordinates: result[0].coordinates
                    };

                    this.otherItems = result.slice(1).map((item, index) => ({
                        Id: item.id,
                        name: item.name,
                        ImageUrl__c: item.imageUrl,
                        coordinates: item.coordinates,
                        resizedCoordinates: item.coordinates, 
                        mrp: item.mrp,
                        number: index + 1,
                        Quantity: 0
                    }));

                    this.adjustCoordinates();
                } else {
                    this.selectedItem = null;
                    this.otherItems = [];
                }
            })
            .catch(error => {
                this.selectedItem = null;
                this.otherItems = [];
                this.showImageAndButtons = false;
                console.error('Error:', error);
            });
    }

    handleImageLoad(event) {
        const img = event.target;
        this.originalWidth = img.naturalWidth;
        this.originalHeight = img.naturalHeight;

        const cardElement = this.template.querySelector('div[ref="cardElement"]');
        const img1 = this.template.querySelector('.fixed-size-image');
        
        if (cardElement) {
            cardElement.style.maxHeight = `${img1.naturalHeight}px`;
        }

        this.adjustCoordinates();
    }

    adjustCoordinates() {
        if (!this.originalWidth || !this.originalHeight) {
            return;
        }

        const img = this.template.querySelector('.fixed-size-image');
        const currentWidth = img.clientWidth;
        const currentHeight = img.clientHeight;

        this.otherItems = this.otherItems.map(item => {
            const coords = item.coordinates.split(',').map(coord => parseInt(coord, 10));

            const adjustedCoords = coords.map((coord, index) => {
                if (index % 2 === 0) { // x coordinate
                    return Math.round((coord / this.originalWidth) * currentWidth);
                } else { // y coordinate
                    return Math.round((coord / this.originalHeight) * currentHeight);
                }
            }).join(',');

            return { ...item, resizedCoordinates: adjustedCoords };
        });

        this.positionNumbers();
    }

    handleAreaClick(event) {
        event.preventDefault();
        const itemId = event.target.dataset.id;

        this.selectedItem = this.otherItems.find(item => item.Id === itemId);
        this.searchKey = this.selectedItem.name;
        this.fetchItemDetails(itemId);
    }

    positionNumbers() {
        const numberContainer = this.template.querySelector('.number-container');
        numberContainer.innerHTML = '';

        this.otherItems.forEach(item => {
            const coords = item.resizedCoordinates.split(',').map(coord => parseInt(coord, 10));
            const [x1, y1, x2, y2] = coords;
            const left = x1 + (x2 - x1) / 2;
            const top = y1 + (y2 - y1) / 2;

            const numberElement = document.createElement('div');
            numberElement.classList.add('number');
            numberElement.textContent = item.number;
            numberElement.style.position = 'absolute';
            numberElement.style.left = `${left}px`;
            numberElement.style.top = `${top}px`;
            numberElement.style.transform = 'translate(-50%, -50%)';

            numberContainer.appendChild(numberElement);
        });
    }

    handleMinusQuantity(event) {
        const itemId = event.target.dataset.id;
        const itemIndex = this.otherItems.findIndex(item => item.Id === itemId);

        if (itemIndex !== -1 && this.otherItems[itemIndex].Quantity > 0) {
            this.otherItems[itemIndex].Quantity -= 1;
            this.otherItems = [...this.otherItems];
        }
    }

    handleAddQuantity(event) {
        const itemId = event.target.dataset.id;
        const itemIndex = this.otherItems.findIndex(item => item.Id === itemId);

        if (itemIndex !== -1) {
            this.otherItems[itemIndex].Quantity += 1;
            this.otherItems = [...this.otherItems];
        }
    }

    handleAddButtonClick(event) {
        const itemId = event.target.dataset.id;
        const Item = this.otherItems.find(item => item.Id === itemId);
 
        if (this.objectApiName === 'dmpl__SaleOrder__c') {
            this.createSaleOrderLine(itemId,Item);
        } 
        else if (this.objectApiName === 'dmpl__RepairOrder__c') {
            this.createRepairOrderLine(itemId, Item);
        }
    }

    createSaleOrderLine(itemId, item) {
    
        const fields = {};
        fields[DMPL_SALE_ORDER_ID_FIELD.fieldApiName] = this.recordId;
        fields[DMPL_ITEM_ID_FIELD.fieldApiName] = itemId;
        fields[DMPL_ITEM_QUANTITY_FIELD.fieldApiName] = item.Quantity;
        console.log("Here",item.Quantity);

        const recordInput = { apiName: SALE_ORDER_LINE_OBJECT.objectApiName, fields };

        createRecord(recordInput)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Sale Order Line created successfully',
                        variant: 'success',
                    }),
                );
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: 'Error adding item to Sale Order',
                        variant: 'error',
                    }),
                );
                console.error('Error adding item to Sale Order:', error);
            });
    }

    createRepairOrderLine(itemId, Item) {
        const fields = {};
 
        fields[DMPL_REPAIR_ORDER_ID_FIELD.fieldApiName] = this.recordId;
        fields[DMPL_REPAIR_ITEM_ID_FIELD.fieldApiName] = itemId;
        fields[DMPL_REPAIR_ITEM_QUANTITY_FIELD.fieldApiName] = Item.Quantity;
        console.log("Here : ",Item.Quantity);
 
        const recordInput = {apiName : REPAIR_ORDER_LINE_OBJECT.objectApiName, fields};
        createRecord(recordInput)
        .then(repairOrderLine => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Repair Order Line created successfully',
                    variant: 'success'
                })
            );
            console.log('Created Repair Order Line:', repairOrderLine);
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating record',
                    message: error.body.message,
                    variant: 'error'
                })
            );
            console.error('Error creating record:', error);
        });      
    }
}