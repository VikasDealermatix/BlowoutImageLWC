public with sharing class ProductCatalogController {
    @AuraEnabled(cacheable=true)
    public static List<dmpl__Item__c> getItemsByName(String itemName) {
        return [
            SELECT  Id, Name, dmpl__ItemCode__c, dmpl__ItemType__c, dmpl__ItemSubType__c, dmpl__ContractPostingTreatment__c, Brand__c,
                    M_R_P__c
            FROM dmpl__Item__c
            WHERE Name LIKE :('%' + itemName + '%') LIMIT 3
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<ItemComponentWrapper> getItemComponentsByItemId(Id itemId) {
        List<ItemComponentWrapper> itemComponents = new List<ItemComponentWrapper>();

        dmpl__Item__c parentItem = [
            SELECT Id, Name, Image_Url__c, M_R_P__c
            FROM dmpl__Item__c
            WHERE Id = :itemId
            LIMIT 1
        ];

        itemComponents.add(new ItemComponentWrapper(
            parentItem.Id, 
            parentItem.Name, 
            null,
            null,
            parentItem.Image_Url__c
        ));

        List<dmpl__ItemComponent__c> itemComponentRecords = [
            SELECT  Id, Name, Part_Coordinate__c, dmpl__ComponentItemId__c,dmpl__ComponentItemId__r.M_R_P__c,
                    dmpl__ComponentItemId__r.Name
            FROM dmpl__ItemComponent__c
            WHERE dmpl__ItemId__c = :itemId
        ];

        for (dmpl__ItemComponent__c itemComponent : itemComponentRecords) {
            itemComponents.add(new ItemComponentWrapper(
                itemComponent.dmpl__ComponentItemId__c, 
                itemComponent.dmpl__ComponentItemId__r.Name, 
                itemComponent.Part_Coordinate__c,
                itemComponent.dmpl__ComponentItemId__r.M_R_P__c,
                null 
            ));
        }

        return itemComponents;
    }

    public class ItemComponentWrapper {
        @AuraEnabled public Id      id;
        @AuraEnabled public String  name;
        @AuraEnabled public String  coordinates;
        @AuraEnabled public Decimal  mrp;
        @AuraEnabled public String  imageUrl;

        public ItemComponentWrapper(Id id, String name, String coordinates,Decimal mrp, String imageUrl) {
            this.id = id;
            this.name = name;
            this.coordinates = coordinates;
            this.mrp = mrp;
            this.imageUrl = imageUrl;
        }
    }
}