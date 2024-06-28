import { LightningElement, track, wire } from 'lwc';
import searchItemByName from '@salesforce/apex/productCatelogeView.searchItemByName';

export default class ImageComponent extends LightningElement {
    imageUrl = 'https://curious-badger-nsrpoo-dev-ed--c.trailblaze.vf.force.com/resource/1719315459000/image';
    @track name = '';  // Name input field value
    @track items;  // List of search results

    handleInputChange(event) 
    {
        this.name = event.target.value;
        console.log("Here 1 " );
        this.searchItems(this.name);
    }

    searchItems(name) 
    {
        searchItemByName({name })
            .then(result => {
                this.items = result;
                console.log("Here");
                console.log(result);
                console.log(this.items);
                console.log('Search Results:', JSON.stringify(this.items, null, 2));
            })
            .catch(error => {
                this.items = [];
                console.error('Error:', error);
            });
    }
}