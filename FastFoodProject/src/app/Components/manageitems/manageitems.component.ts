import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import axios from 'axios';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manageitems',
  templateUrl: './manageitems.component.html',
  styleUrls: ['./manageitems.component.css']
})
export class ManageitemsComponent implements OnInit {
  foodItems: any[] = [];
  filteredItems: any[] = [];
  foodTypes: string[] = [];
  selectedFoodType: string | null = null;
  showAddItemForm: boolean = false;
  editingItem: any = null;
  token: string | null = null;
  showDeleteConfirmation: boolean = false;
  itemToDelete: any = null;
  notification: { message: string, type: string } | null = null;
  menuVisible = true;
  showLogoutModal = false;

  // Reactive form group for add/update item
  itemForm: FormGroup;

  constructor(private router: Router, private fb: FormBuilder) {
    // Initialize form with validators
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      price: [0, [Validators.required, Validators.min(0.01)]],
      imgUrl: ['', [Validators.required, Validators.pattern(/https?:\/\/.+/)]],
      foodType: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.token = localStorage.getItem('jwtToken');
    this.loadFoodItems();
  }

  async loadFoodItems() {
    try {
      const response = await axios.get('http://localhost:5270/api/fooditems', {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      this.foodItems = response.data;
      this.filteredItems = this.foodItems;
      this.extractFoodTypes();
    } catch (error) {
      console.error('Error loading food items', error);
      this.notification = { message: 'Failed to load food items', type: 'error' };
      this.showNotification();
    }
  }

  extractFoodTypes() {
    const types = new Set(this.foodItems.map(item => item.foodType));
    this.foodTypes = Array.from(types);
  }

  filterItemsByType(type: string | null) {
    this.selectedFoodType = type;
    this.filteredItems = type
      ? this.foodItems.filter(item => item.foodType === type)
      : this.foodItems;
  }

  toggleAddItemForm(editingItem: any = null) {
    this.showAddItemForm = !this.showAddItemForm;
    if (editingItem) {
      this.editingItem = { ...editingItem }; // Clone to avoid mutations
      this.itemForm.patchValue({
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        imgUrl: editingItem.imgUrl,
        foodType: editingItem.foodType
      });
    } else {
      this.resetForm();
    }
  }

  async addOrUpdateItem() {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      this.notification = { message: 'Please correct the errors in the form.', type: 'error' };
      this.showNotification();
      return;
    }

    const formData = { ...this.itemForm.value };

    try {
      if (this.editingItem) {
        // Ensure ID is included for update operations
        formData.id = this.editingItem.id;
        const updateUrl = `http://localhost:5270/api/fooditems/${this.editingItem.id}`;
        const response = await axios.put(updateUrl, formData, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });

        // Debug response
        console.log('Update Response:', response);

        if (response.status === 200) {
          this.notification = { message: 'Item updated successfully', type: 'success' };
          this.loadFoodItems(); // Refresh list to show the updated item
        } else {
          this.notification = { message: `Error updating item: ${response.statusText}`, type: 'error' };
        }
      } else {
        const response = await axios.post('http://localhost:5270/api/fooditems', formData, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });

        if (response.status === 201) {
          this.foodItems.push(response.data);
          this.notification = { message: 'Item added successfully', type: 'success' };
          this.loadFoodItems(); // Refresh list to show the new item
        } else {
          this.notification = { message: `Error adding item: ${response.statusText}`, type: 'error' };
        }
      }

      this.resetForm();
      this.showNotification();
    } catch (error) {
      // Improved error handling
      console.error('Error occurred', error);

      let errorMessage = 'Unexpected error occurred';
      if (axios.isAxiosError(error)) {
        // Handle Axios errors
        if (error.response) {
          // Server responded with a status other than 2xx
          errorMessage = `Error: ${error.response.status} - ${error.response.statusText}`;
        } else if (error.request) {
          // No response was received
          errorMessage = 'No response received from the server.';
        } else {
          // Error setting up the request
          errorMessage = `Request error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        // General JavaScript errors
        errorMessage = `Error: ${error.message}`;
      }

      this.notification = { message: errorMessage, type: 'error' };
      this.showNotification();
    }
  }

  showNotification() {
    setTimeout(() => {
      this.notification = null;
    }, 3000);
  }

  async deleteItem(id: number) {
    this.itemToDelete = id;
    this.showDeleteConfirmation = true;
  }

  async confirmDelete() {
    if (this.itemToDelete) {
      try {
        const response = await axios.delete(`http://localhost:5270/api/fooditems/${this.itemToDelete}`, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        });

        if (response.status === 204) {
          this.loadFoodItems();
          this.itemToDelete = null;
          this.showDeleteConfirmation = false;
          this.notification = { message: 'Item deleted successfully', type: 'success' };
          this.showNotification();
        } else {
          this.notification = { message: 'Error deleting item', type: 'error' };
        }
      } catch (error) {
        console.error('Error deleting food item', error);
        this.notification = { message: 'Error occurred', type: 'error' };
        this.showNotification();
      }
    }
  }

  cancelDelete() {
    this.itemToDelete = null;
    this.showDeleteConfirmation = false;
  }

  getImageUrl(imgUrl: string): string {
    return imgUrl;
  }

  resetForm() {
    this.itemForm.reset();
    this.editingItem = null;
  }

  navigateToAdminDash() {
    this.router.navigate(['/admindash']);
  }

  logout() {
    localStorage.removeItem('jwtToken');
    this.router.navigate(['/home']);
  }

  toggleMenu() {
    this.menuVisible = !this.menuVisible;
  }

  openLogoutModal() {
    this.showLogoutModal = true;
  }

  closeLogoutModal() {
    this.showLogoutModal = false;
  }

  confirmLogout() {
    localStorage.removeItem('jwtToken');
    this.router.navigate(['/login']);
    this.showLogoutModal = false;
  }
}
