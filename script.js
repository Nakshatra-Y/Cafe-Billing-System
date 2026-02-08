/* ============================================
   Café Billing App - JavaScript
   Beginner-friendly with simple logic

   FILE STRUCTURE (sections for easy navigation):
   1. Variables & constants
   2. Helper functions (storage, showSection)
   3. Menu functions
   4. Create bill & save
   5. Pending bills
   6. Completed bills
   7. Bill detail (add items, edit quantity, remove items)
   8. Download PDF
   9. Manage menu
  10. Event listeners (DOMContentLoaded)

   Keeping one file is simpler for beginners - no module loading.
   ============================================ */

// Storage keys for LocalStorage
var STORAGE_KEY = "cafe-bills";
var MENU_STORAGE_KEY = "cafe-menu";
var TABLES_STORAGE_KEY = "cafe-tables";

// Default menu (used when nothing saved yet)
var DEFAULT_MENU = {
  coffee: [
    { name: "Espresso", price: 80 },
    { name: "Cappuccino", price: 120 },
    { name: "Latte", price: 130 },
    { name: "Americano", price: 100 },
    { name: "Cold Coffee", price: 110 },
  ],
  snacks: [
    { name: "Samosa", price: 30 },
    { name: "Sandwich", price: 60 },
    { name: "Croissant", price: 70 },
    { name: "Cake Slice", price: 80 },
    { name: "Cookies", price: 40 },
  ],
  meals: [
    { name: "Pasta", price: 150 },
    { name: "Burger", price: 120 },
    { name: "Pizza Slice", price: 100 },
    { name: "Soup", price: 90 },
    { name: "Salad", price: 110 },
  ],
};

// Default table numbers
var DEFAULT_TABLES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"];

// Current bill: array of items (each has name, price, quantity)
var currentBillItems = [];

// The bill we are currently viewing (for detail/complete screen)
var viewingBillId = null;

// Which list we came from: 'pending' or 'completed'
var viewingFromSection = "pending";

/* ============================================
   HELPER FUNCTIONS
   ============================================ */

// Get all bills from LocalStorage
function getAllBills() {
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) {
    return [];
  }
  return JSON.parse(saved);
}

// Save all bills to LocalStorage
function saveAllBills(bills) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

// Get menu from LocalStorage (or default)
function getMenu() {
  var saved = localStorage.getItem(MENU_STORAGE_KEY);
  if (saved === null) {
    return JSON.parse(JSON.stringify(DEFAULT_MENU));
  }
  return JSON.parse(saved);
}

// Save menu to LocalStorage
function saveMenu(menu) {
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menu));
}

// Get table list from LocalStorage (or default)
function getTables() {
  var saved = localStorage.getItem(TABLES_STORAGE_KEY);
  if (saved === null) {
    return DEFAULT_TABLES.slice();
  }
  var tables = JSON.parse(saved);

  // Ensure we have at least the default tables (merge if missing)
  var changed = false;
  DEFAULT_TABLES.forEach(function (t) {
    if (tables.indexOf(t) === -1) {
      tables.push(t);
      changed = true;
    }
  });

  if (changed) {
    // Sort numerically to keep order nice
    tables.sort(function (a, b) {
      return parseInt(a) - parseInt(b);
    });
    saveTables(tables);
  }

  return tables;
}

// Save table list to LocalStorage
function saveTables(tables) {
  localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(tables));
}

// Create a simple key from category name (lowercase, no spaces)
function createCategoryKey(name) {
  return name.toLowerCase().replace(/\s+/g, "").trim();
}

// Generate a simple unique id for new bills
function generateBillId() {
  return "BILL-" + Date.now();
}

// Show a section and hide others (single-page behavior)
function showSection(sectionId) {
  var sections = document.querySelectorAll(".section");
  sections.forEach(function (section) {
    section.classList.remove("active");
  });
  var target = document.getElementById(sectionId);
  if (target) {
    target.classList.add("active");
  }

  // Update nav button active state (sectionId is like "create-section")
  var navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(function (btn) {
    btn.classList.remove("active");
    var section = btn.getAttribute("data-section");
    if (section && sectionId === section + "-section") {
      btn.classList.add("active");
    }
  });
}

/* ============================================
   MENU FUNCTIONS
   ============================================ */

// Render category buttons from current menu
function renderCategoryButtons() {
  var menu = getMenu();
  var container = document.getElementById("category-buttons");
  var categories = Object.keys(menu);

  if (categories.length === 0) {
    container.innerHTML =
      '<p class="empty-message">No categories yet. Add some in Manage Menu.</p>';
    return;
  }

  container.innerHTML = "";
  categories.forEach(function (categoryKey) {
    // Display name: capitalize first letter
    var displayName =
      categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
    var btn = document.createElement("button");
    btn.className = "category-btn";
    btn.setAttribute("data-category", categoryKey);
    btn.textContent = displayName;
    btn.addEventListener("click", function () {
      var categoryBtns = document.querySelectorAll(".category-btn");
      categoryBtns.forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      loadMenuItems(categoryKey);
    });
    container.appendChild(btn);
  });
}

// Load and display menu items when user selects a category
function loadMenuItems(category) {
  var menu = getMenu();
  var items = menu[category];
  var container = document.getElementById("menu-items");

  if (!items || items.length === 0) {
    container.innerHTML =
      '<p class="empty-message">No items in this category.</p>';
    return;
  }

  // Clear and add buttons for each menu item
  container.innerHTML = "";
  items.forEach(function (item) {
    var btn = document.createElement("button");
    btn.className = "menu-item-btn";
    btn.textContent = item.name + " - ₹" + item.price;
    // When clicked, add this item to the bill
    btn.addEventListener("click", function () {
      addItemToBill(item.name, item.price);
    });
    container.appendChild(btn);
  });
}

// Add item to current bill. If item exists, increase quantity.
function addItemToBill(name, price) {
  var found = false;
  for (var i = 0; i < currentBillItems.length; i++) {
    if (currentBillItems[i].name === name) {
      currentBillItems[i].quantity = currentBillItems[i].quantity + 1;
      found = true;
      break;
    }
  }
  if (!found) {
    currentBillItems.push({ name: name, price: price, quantity: 1 });
  }
  updateBillDisplay();
}

// Update the Current Bill display on screen
function updateBillDisplay() {
  var container = document.getElementById("bill-items");
  var totalEl = document.getElementById("total-amount");

  if (currentBillItems.length === 0) {
    container.innerHTML =
      '<p class="empty-message">No items added yet. Select a category and add items above.</p>';
    totalEl.textContent = "0";
    return;
  }

  var total = 0;
  var html = "";
  currentBillItems.forEach(function (item) {
    var subtotal = item.price * item.quantity;
    total = total + subtotal;
    html = html + '<div class="bill-row">';
    html = html + "<span>" + item.name + " x " + item.quantity + "</span>";
    html = html + "<span>₹" + subtotal + "</span>";
    html = html + "</div>";
  });

  container.innerHTML = html;
  totalEl.textContent = total;
}

// Clear the current bill
function clearBill() {
  currentBillItems = [];
  updateBillDisplay();
}

/* ============================================
   TABLE FUNCTIONS
   ============================================ */

// Load table numbers into the dropdown
function loadTableSelect() {
  var tables = getTables();
  var select = document.getElementById("table-select");

  select.innerHTML = '<option value="">Select Table</option>';
  tables.forEach(function (tableNo) {
    var option = document.createElement("option");
    option.value = tableNo;
    option.textContent = "Table " + tableNo;
    select.appendChild(option);
  });
}

// Get selected table number
function getSelectedTable() {
  return document.getElementById("table-select").value;
}

/* ============================================
   MANAGE MENU FUNCTIONS
   ============================================ */

// Add a new category
function addCategory() {
  var input = document.getElementById("new-category-input");
  var name = input.value.trim();

  if (name === "") {
    alert("Please enter a category name.");
    return;
  }

  var key = createCategoryKey(name);
  var menu = getMenu();

  if (menu[key]) {
    alert("This category already exists.");
    return;
  }

  menu[key] = [];
  saveMenu(menu);

  input.value = "";
  alert("Category added!");
  renderCategoryButtons();
  renderManageMenuDisplay();
  updateProductCategorySelect();
}

// Add a new product to a category
function addProduct() {
  var categorySelect = document.getElementById("product-category-select");
  var nameInput = document.getElementById("new-product-name");
  var priceInput = document.getElementById("new-product-price");

  var categoryKey = categorySelect.value;
  var name = nameInput.value.trim();
  var price = parseInt(priceInput.value, 10);

  if (!categoryKey) {
    alert("Please select a category first.");
    return;
  }
  if (name === "") {
    alert("Please enter a product name.");
    return;
  }
  if (isNaN(price) || price < 1) {
    alert("Please enter a valid price (number greater than 0).");
    return;
  }

  var menu = getMenu();
  if (!menu[categoryKey]) {
    menu[categoryKey] = [];
  }

  menu[categoryKey].push({ name: name, price: price });
  saveMenu(menu);

  nameInput.value = "";
  priceInput.value = "";
  alert("Product added!");
  loadMenuItems(categoryKey);
  renderManageMenuDisplay();
}

// Add a new table number
function addTable() {
  var input = document.getElementById("new-table-input");
  var value = input.value.trim();

  if (value === "") {
    alert("Please enter a table number.");
    return;
  }

  var tables = getTables();
  if (tables.indexOf(value) >= 0) {
    alert("This table number already exists.");
    return;
  }

  tables.push(value);
  saveTables(tables);

  input.value = "";
  alert("Table added!");
  loadTableSelect();
}

// Update the category dropdown in Add Product form
function updateProductCategorySelect() {
  var menu = getMenu();
  var categories = Object.keys(menu);
  var select = document.getElementById("product-category-select");

  select.innerHTML = '<option value="">Select category</option>';
  categories.forEach(function (key) {
    var displayName = key.charAt(0).toUpperCase() + key.slice(1);
    var option = document.createElement("option");
    option.value = key;
    option.textContent = displayName;
    select.appendChild(option);
  });
}

// Remove a product from menu
function removeProduct(categoryKey, index) {
  var menu = getMenu();
  if (menu[categoryKey] && menu[categoryKey][index]) {
    menu[categoryKey].splice(index, 1);
    saveMenu(menu);
    renderManageMenuDisplay();
    renderCategoryButtons();
  }
}

// Edit a product - change name or price
function editProduct(categoryKey, index, newName, newPrice) {
  var menu = getMenu();
  if (!menu[categoryKey] || !menu[categoryKey][index]) return;
  newName = (newName || "").trim();
  newPrice = parseInt(newPrice, 10);
  if (newName === "") {
    alert("Product name cannot be empty.");
    return;
  }
  if (isNaN(newPrice) || newPrice < 1) {
    alert("Please enter a valid price (number greater than 0).");
    return;
  }
  menu[categoryKey][index].name = newName;
  menu[categoryKey][index].price = newPrice;
  saveMenu(menu);
  renderManageMenuDisplay();
  renderCategoryButtons();
}

// Delete a category and all its products
function deleteCategory(categoryKey) {
  var menu = getMenu();
  if (!menu[categoryKey]) return;
  var displayName = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
  if (
    !confirm(
      "Delete category '" +
      displayName +
      "' and all its products? This cannot be undone."
    )
  ) {
    return;
  }
  delete menu[categoryKey];
  saveMenu(menu);
  renderManageMenuDisplay();
  renderCategoryButtons();
  updateProductCategorySelect();
}

// Display current menu in Manage section
function renderManageMenuDisplay() {
  var menu = getMenu();
  var container = document.getElementById("manage-menu-display");

  var categories = Object.keys(menu);
  if (categories.length === 0) {
    container.innerHTML =
      '<p class="empty-message">No categories or products yet.</p>';
    return;
  }

  var html = "";
  categories.forEach(function (categoryKey) {
    var displayName =
      categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
    html =
      html +
      '<div class="manage-category-block" data-category="' +
      categoryKey +
      '">';
    html =
      html +
      "<h4>" +
      displayName +
      ' <button type="button" class="btn-delete-category" data-action="delete-category" data-category="' +
      categoryKey +
      '">Delete Category</button></h4>';

    var items = menu[categoryKey] || [];
    if (items.length === 0) {
      html =
        html + '<p class="empty-message">No products in this category.</p>';
    } else {
      items.forEach(function (item, index) {
        html =
          html +
          '<div class="manage-product-item" data-category="' +
          categoryKey +
          '" data-index="' +
          index +
          '">';
        html = html + "<span>" + item.name + " - ₹" + item.price + "</span>";
        html =
          html +
          '<button type="button" class="btn-edit btn-small" data-action="edit" data-category="' +
          categoryKey +
          '" data-index="' +
          index +
          '">Edit</button>';
        html =
          html +
          '<button type="button" class="btn btn-secondary btn-small" data-action="remove" data-category="' +
          categoryKey +
          '" data-index="' +
          index +
          '">Remove</button>';
        html = html + "</div>";
      });
    }
    html = html + "</div>";
  });

  container.innerHTML = html;

  // Add click handlers for Edit, Remove, Delete Category
  container.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    var cat = btn.getAttribute("data-category");
    var idx = parseInt(btn.getAttribute("data-index"), 10);

    if (action === "delete-category") {
      deleteCategory(cat);
    } else if (action === "remove") {
      removeProduct(cat, idx);
    } else if (action === "edit") {
      showEditProductForm(cat, idx);
    }
  });
}

// Show inline edit form for a product
function showEditProductForm(categoryKey, index) {
  var menu = getMenu();
  if (!menu[categoryKey] || !menu[categoryKey][index]) return;
  var item = menu[categoryKey][index];

  var row = document.querySelector(
    '.manage-product-item[data-category="' +
    categoryKey +
    '"][data-index="' +
    index +
    '"]'
  );
  if (!row) return;

  var editHtml =
    '<div class="manage-product-edit">' +
    '<input type="text" class="edit-name form-input" value="' +
    item.name.replace(/"/g, "&quot;") +
    '" placeholder="Product name">' +
    '<input type="number" class="edit-price form-input" min="1" value="' +
    item.price +
    '" placeholder="Price">' +
    '<button type="button" class="btn btn-primary btn-small" data-action="save-edit" data-category="' +
    categoryKey +
    '" data-index="' +
    index +
    '">Save</button>' +
    '<button type="button" class="btn btn-secondary btn-small" data-action="cancel-edit">Cancel</button>' +
    "</div>";

  row.innerHTML = editHtml;

  var saveBtn = row.querySelector("[data-action=save-edit]");
  var cancelBtn = row.querySelector("[data-action=cancel-edit]");

  saveBtn.addEventListener("click", function () {
    var nameInput = row.querySelector(".edit-name");
    var priceInput = row.querySelector(".edit-price");
    editProduct(categoryKey, index, nameInput.value, priceInput.value);
  });

  cancelBtn.addEventListener("click", function () {
    renderManageMenuDisplay();
  });
}

/* ============================================
   SAVE BILL
   ============================================ */

function saveBill() {
  var tableNo = getSelectedTable();
  if (!tableNo) {
    alert("Please select a table number before saving.");
    return;
  }
  if (currentBillItems.length === 0) {
    alert("Please add at least one item to the bill before saving.");
    return;
  }

  var total = 0;
  currentBillItems.forEach(function (item) {
    total = total + item.price * item.quantity;
  });

  var bill = {
    id: generateBillId(),
    tableNo: tableNo,
    items: currentBillItems.slice(), // copy of current items
    totalAmount: total,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  var bills = getAllBills();
  bills.push(bill);
  saveAllBills(bills);

  clearBill();
  alert("Bill saved successfully!");
  showSection("create-section");
}

/* ============================================
   PENDING BILLS
   ============================================ */

function loadPendingBills() {
  var bills = getAllBills();
  var pendingBills = bills.filter(function (bill) {
    return bill.status === "PENDING";
  });

  var searchTerm = (document.getElementById("pending-search-input").value || "")
    .trim()
    .toLowerCase();
  if (searchTerm) {
    pendingBills = pendingBills.filter(function (bill) {
      var idMatch = (bill.id || "").toLowerCase().indexOf(searchTerm) >= 0;
      var tableMatch =
        (bill.tableNo || "").toLowerCase().indexOf(searchTerm) >= 0;
      return idMatch || tableMatch;
    });
  }

  var container = document.getElementById("pending-list");

  if (pendingBills.length === 0) {
    container.innerHTML = searchTerm
      ? '<p class="empty-message">No matching pending bills.</p>'
      : '<p class="empty-message">No pending bills.</p>';
    return;
  }

  container.innerHTML = "";
  pendingBills.forEach(function (bill) {
    var card = document.createElement("div");
    card.className = "pending-bill-card";
    var tableText = bill.tableNo ? "Table " + bill.tableNo + " • " : "";
    card.innerHTML =
      '<div class="bill-id">' +
      tableText +
      bill.id +
      "</div>" +
      '<div class="bill-total-amount">Total: ₹' +
      bill.totalAmount +
      "</div>";

    // When user clicks this bill, show its details
    card.addEventListener("click", function () {
      viewingFromSection = "pending";
      showBillDetail(bill.id);
    });
    container.appendChild(card);
  });
}

/* ============================================
   COMPLETED BILLS
   ============================================ */

function loadCompletedBills() {
  var bills = getAllBills();
  var completedBills = bills.filter(function (bill) {
    return bill.status === "COMPLETED";
  });

  var searchTerm = (
    document.getElementById("completed-search-input").value || ""
  )
    .trim()
    .toLowerCase();
  if (searchTerm) {
    completedBills = completedBills.filter(function (bill) {
      var idMatch = (bill.id || "").toLowerCase().indexOf(searchTerm) >= 0;
      var tableMatch =
        (bill.tableNo || "").toLowerCase().indexOf(searchTerm) >= 0;
      return idMatch || tableMatch;
    });
  }

  var container = document.getElementById("completed-list");

  if (completedBills.length === 0) {
    container.innerHTML = searchTerm
      ? '<p class="empty-message">No matching completed bills.</p>'
      : '<p class="empty-message">No completed bills yet.</p>';
    return;
  }

  container.innerHTML = "";
  completedBills.forEach(function (bill) {
    var card = document.createElement("div");
    card.className = "pending-bill-card completed-bill-card";
    var tableText = bill.tableNo ? "Table " + bill.tableNo + " • " : "";
    var completedText = bill.completedAt
      ? formatDateTime(bill.completedAt)
      : "";
    card.innerHTML =
      '<div class="bill-id">' +
      tableText +
      bill.id +
      "</div>" +
      (completedText
        ? '<div class="bill-completed-at">Completed: ' +
        completedText +
        "</div>"
        : "") +
      '<div class="bill-total-amount">Total: ₹' +
      bill.totalAmount +
      "</div>";

    // When user clicks this bill, show its details
    card.addEventListener("click", function () {
      viewingFromSection = "completed";
      showBillDetail(bill.id);
    });
    container.appendChild(card);
  });
}

// Show bill detail section for a specific bill
function showBillDetail(billId) {
  viewingBillId = billId;
  var bills = getAllBills();
  var bill = null;
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].id === billId) {
      bill = bills[i];
      break;
    }
  }

  if (!bill) {
    alert("Bill not found.");
    return;
  }

  var container = document.getElementById("bill-detail-content");
  var tableText = bill.tableNo ? "Table " + bill.tableNo + " • " : "";
  var completedText =
    bill.status === "COMPLETED" && bill.completedAt
      ? '<div class="bill-completed-at" style="margin-bottom: 12px; color: #6b8e23;">Completed: ' +
      formatDateTime(bill.completedAt) +
      "</div>"
      : "";
  var html =
    '<div class="bill-id" style="margin-bottom: 12px;">' +
    tableText +
    bill.id +
    "</div>" +
    completedText;

  if (bill.status === "PENDING") {
    // Editable rows: reduce, quantity input, increase, remove
    bill.items.forEach(function (item, index) {
      var subtotal = item.price * item.quantity;
      html =
        html +
        '<div class="detail-row-editable" data-item-index="' +
        index +
        '">';
      html =
        html +
        '<div class="item-info"><span>' +
        item.name +
        "</span> × <span>₹" +
        item.price +
        "</span> = ₹" +
        subtotal +
        "</div>";
      html = html + '<div class="item-controls">';
      html =
        html +
        '<button type="button" class="qty-control-btn" data-action="reduce" data-item-index="' +
        index +
        '">−</button>';
      html =
        html +
        '<input type="number" min="0" class="qty-input" value="' +
        item.quantity +
        '" data-action="setqty" data-item-index="' +
        index +
        '">';
      html =
        html +
        '<button type="button" class="qty-control-btn" data-action="increase" data-item-index="' +
        index +
        '">+</button>';
      html =
        html +
        '<button type="button" class="btn-remove-item" data-action="remove" data-item-index="' +
        index +
        '">Remove</button>';
      html = html + "</div></div>";
    });
  } else {
    // Read-only rows for completed bills
    bill.items.forEach(function (item) {
      var subtotal = item.price * item.quantity;
      html = html + '<div class="detail-row">';
      html = html + "<span>" + item.name + " x " + item.quantity + "</span>";
      html = html + "<span>₹" + subtotal + "</span>";
      html = html + "</div>";
    });
  }

  html =
    html + '<div class="detail-total">Total: ₹' + bill.totalAmount + "</div>";
  container.innerHTML = html;

  // Add event delegation for PENDING bill controls
  if (bill.status === "PENDING") {
    container.onclick = function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn || !viewingBillId) return;
      var action = btn.getAttribute("data-action");
      var index = parseInt(btn.getAttribute("data-item-index"), 10);
      if (action === "reduce") {
        updatePendingBillItemQuantity(viewingBillId, index, -1);
      } else if (action === "increase") {
        updatePendingBillItemQuantity(viewingBillId, index, 1);
      } else if (action === "remove") {
        removeItemFromPendingBill(viewingBillId, index);
      }
    };
    container.onchange = function (e) {
      var input = e.target;
      if (
        input.classList.contains("qty-input") &&
        input.getAttribute("data-action") === "setqty"
      ) {
        var index = parseInt(input.getAttribute("data-item-index"), 10);
        var qty = parseInt(input.value, 10);
        if (!isNaN(qty) && qty >= 0) {
          setPendingBillItemQuantity(viewingBillId, index, qty);
        } else {
          showBillDetail(viewingBillId);
        }
      }
    };
  } else {
    container.onclick = null;
    container.onchange = null;
  }

  // Show or hide Complete Bill button and Add More Items based on bill status
  var completeBtn = document.getElementById("complete-bill-btn");
  var backBtn = document.getElementById("back-to-pending-btn");
  var addItemsArea = document.getElementById("bill-detail-add-items");

  var cancelBtn = document.getElementById("cancel-bill-btn");
  if (bill.status === "COMPLETED") {
    completeBtn.style.display = "none";
    cancelBtn.style.display = "none";
    backBtn.textContent = "Back to Completed Bills";
    addItemsArea.style.display = "none";
  } else {
    completeBtn.style.display = "";
    cancelBtn.style.display = "";
    backBtn.textContent = "Back to Pending Bills";
    addItemsArea.style.display = "block";
    loadBillDetailAddItems(billId);
  }

  showSection("bill-detail-section");
}

// Load category buttons and menu for "Add More Items" in pending bill detail
function loadBillDetailAddItems(billId) {
  var menu = getMenu();
  var categories = Object.keys(menu);
  var catContainer = document.getElementById("bill-detail-category-buttons");

  catContainer.innerHTML = "";
  categories.forEach(function (categoryKey) {
    var displayName =
      categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
    var btn = document.createElement("button");
    btn.className = "category-btn";
    btn.setAttribute("data-category", categoryKey);
    btn.textContent = displayName;
    btn.addEventListener("click", function () {
      var allBtns = catContainer.querySelectorAll(".category-btn");
      allBtns.forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      loadBillDetailMenuItems(viewingBillId, categoryKey);
    });
    catContainer.appendChild(btn);
  });
}

// Load menu items in bill detail view - clicking adds to the pending bill
// Uses viewingBillId so we always add to the bill currently being viewed
function loadBillDetailMenuItems(billId, category) {
  var menu = getMenu();
  var items = menu[category];
  var container = document.getElementById("bill-detail-menu-items");

  if (!items || items.length === 0) {
    container.innerHTML =
      '<p class="empty-message">No items in this category.</p>';
    return;
  }

  container.innerHTML = "";
  items.forEach(function (item) {
    var btn = document.createElement("button");
    btn.className = "menu-item-btn";
    btn.textContent = item.name + " - ₹" + item.price;
    btn.type = "button"; // Prevents any form submit behaviour
    btn.addEventListener("click", function () {
      // Always use viewingBillId - the bill we are viewing right now
      addItemToPendingBill(viewingBillId, item.name, item.price);
    });
    container.appendChild(btn);
  });
}

// Add an item to a pending bill (when customer orders more in the middle)
function addItemToPendingBill(billId, name, price) {
  if (!billId) {
    alert("No bill selected.");
    return;
  }

  var bills = getAllBills();
  var billIndex = -1;
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].id === billId) {
      billIndex = i;
      break;
    }
  }

  if (billIndex < 0 || bills[billIndex].status !== "PENDING") {
    alert("Cannot add items to this bill.");
    return;
  }

  var bill = bills[billIndex];

  // Add or increase quantity
  var found = false;
  for (var j = 0; j < bill.items.length; j++) {
    if (bill.items[j].name === name) {
      bill.items[j].quantity = bill.items[j].quantity + 1;
      found = true;
      break;
    }
  }
  if (!found) {
    bill.items.push({ name: name, price: price, quantity: 1 });
  }

  // Recalculate total
  var total = 0;
  bill.items.forEach(function (item) {
    total = total + item.price * item.quantity;
  });
  bill.totalAmount = total;

  saveAllBills(bills);

  // Refresh - always use viewingBillId to stay on the same bill
  showBillDetail(viewingBillId);
}

// Update item quantity by delta (+1 or -1). If result <= 0, remove item.
function updatePendingBillItemQuantity(billId, itemIndex, delta) {
  if (!billId) return;
  var bills = getAllBills();
  var billIndex = -1;
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].id === billId) {
      billIndex = i;
      break;
    }
  }
  if (billIndex < 0 || bills[billIndex].status !== "PENDING") return;
  var bill = bills[billIndex];
  if (itemIndex < 0 || itemIndex >= bill.items.length) return;

  bill.items[itemIndex].quantity = bill.items[itemIndex].quantity + delta;
  if (bill.items[itemIndex].quantity <= 0) {
    bill.items.splice(itemIndex, 1);
  }
  recalcAndSaveBill(bills, billIndex);
  showBillDetail(viewingBillId);
}

// Set item quantity directly. If 0, remove item.
function setPendingBillItemQuantity(billId, itemIndex, newQty) {
  if (!billId) return;
  var bills = getAllBills();
  var billIndex = -1;
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].id === billId) {
      billIndex = i;
      break;
    }
  }
  if (billIndex < 0 || bills[billIndex].status !== "PENDING") return;
  var bill = bills[billIndex];
  if (itemIndex < 0 || itemIndex >= bill.items.length) return;

  if (newQty <= 0) {
    bill.items.splice(itemIndex, 1);
  } else {
    bill.items[itemIndex].quantity = newQty;
  }
  recalcAndSaveBill(bills, billIndex);
  showBillDetail(viewingBillId);
}

// Remove item from pending bill at given index.
function removeItemFromPendingBill(billId, itemIndex) {
  if (!billId) return;
  var bills = getAllBills();
  var billIndex = -1;
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].id === billId) {
      billIndex = i;
      break;
    }
  }
  if (billIndex < 0 || bills[billIndex].status !== "PENDING") return;
  var bill = bills[billIndex];
  if (itemIndex < 0 || itemIndex >= bill.items.length) return;

  bill.items.splice(itemIndex, 1);
  recalcAndSaveBill(bills, billIndex);
  showBillDetail(viewingBillId);
}

// Helper: recalculate total and save
function recalcAndSaveBill(bills, billIndex) {
  var bill = bills[billIndex];
  var total = 0;
  bill.items.forEach(function (item) {
    total = total + item.price * item.quantity;
  });
  bill.totalAmount = total;
  saveAllBills(bills);
}

// Cancel (delete) a pending bill
function cancelPendingBill(billId) {
  if (!billId) return;
  if (
    !confirm(
      "Are you sure you want to cancel this bill? This cannot be undone."
    )
  ) {
    return;
  }
  var bills = getAllBills();
  var newBills = bills.filter(function (b) {
    return b.id !== billId;
  });
  if (newBills.length === bills.length) {
    alert("Bill not found or already completed.");
    return;
  }
  saveAllBills(newBills);
  viewingBillId = null;
  alert("Bill cancelled.");
  loadPendingBills();
  showSection("pending-section");
}

// Format date/time for display (e.g. "6 Feb 2025, 10:30 AM")
function formatDateTime(isoString) {
  if (!isoString) return "";
  var d = new Date(isoString);
  var months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  var day = d.getDate();
  var month = months[d.getMonth()];
  var year = d.getFullYear();
  var hours = d.getHours();
  var mins = d.getMinutes();
  var ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  mins = mins < 10 ? "0" + mins : mins;
  return (
    day + " " + month + " " + year + ", " + hours + ":" + mins + " " + ampm
  );
}

// Get today's date as YYYY-MM-DD (used by export CSV and clear old bills)
function getTodayDateString() {
  var today = new Date();
  var year = today.getFullYear();
  var month = String(today.getMonth() + 1).padStart(2, "0");
  var day = String(today.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Complete a bill - change status to COMPLETED
function completeBill() {
  if (!viewingBillId) return;

  var bills = getAllBills();
  for (var i = 0; i < bills.length; i++) {
    if (bills[i].id === viewingBillId) {
      bills[i].status = "COMPLETED";
      bills[i].completedAt = new Date().toISOString();
      break;
    }
  }
  saveAllBills(bills);

  viewingBillId = null;
  alert("Bill marked as completed!");
  loadPendingBills();
  showSection("pending-section");
}

/* ============================================
   DATA & BACKUP
   ============================================ */

// Backup all data to a JSON file
function backupApp() {
  var data = {
    bills: getAllBills(),
    menu: getMenu(),
    tables: getTables(),
    backupDate: new Date().toISOString(),
  };

  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "cafe-backup-" + getTodayDateString() + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

// Restore data from a JSON file
function restoreApp(event) {
  var file = event.target.files[0];
  if (!file) {
    return;
  }

  var reader = new FileReader();
  reader.onload = function (e) {
    try {
      var data = JSON.parse(e.target.result);

      if (!data.bills || !data.menu || !data.tables) {
        throw new Error("Invalid backup file format.");
      }

      if (
        !confirm(
          "This will overwrite all current data with the backup. Are you sure?"
        )
      ) {
        // Reset the input so they can try again if they cancel
        event.target.value = "";
        return;
      }

      saveAllBills(data.bills);
      saveMenu(data.menu);
      saveTables(data.tables);

      alert("Data restored successfully! The page will now reload.");
      location.reload();
    } catch (err) {
      alert("Error restoring data: " + err.message);
      // Reset the input
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

// Clear bills older than X days
function clearOldBills() {
  var daysInput = document.getElementById("clear-days-input");
  var days = parseInt(daysInput ? daysInput.value : 30, 10);
  if (isNaN(days) || days < 1) {
    alert("Please enter a valid number of days (1 or more).");
    return;
  }
  if (
    !confirm(
      "Delete all bills older than " + days + " days? This cannot be undone."
    )
  ) {
    return;
  }

  var bills = getAllBills();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  var cutoffTime = cutoff.getTime();

  var beforeCount = bills.length;
  var newBills = bills.filter(function (bill) {
    if (!bill.createdAt) return true; // Keep bills with no date
    var billDate = new Date(bill.createdAt).getTime();
    return billDate >= cutoffTime;
  });
  var removed = beforeCount - newBills.length;

  saveAllBills(newBills);
  alert(removed + " bill(s) removed.");
}

// Export bills to CSV (opens in Excel)
function exportBillsCSV() {
  var bills = getAllBills();
  if (bills.length === 0) {
    alert("No bills to export.");
    return;
  }

  var headers =
    "Bill ID,Table,Status,Created At,Total,Items (name x qty x price)\n";
  var rows = [];
  bills.forEach(function (bill) {
    var itemsStr = "";
    if (bill.items && bill.items.length > 0) {
      itemsStr = bill.items
        .map(function (i) {
          return i.name + " x " + i.quantity + " x " + i.price;
        })
        .join("; ");
    }
    var createdAt = bill.createdAt ? bill.createdAt : "";
    var line =
      (bill.id || "") +
      "," +
      (bill.tableNo || "") +
      "," +
      (bill.status || "") +
      "," +
      createdAt +
      "," +
      (bill.totalAmount || 0) +
      ',"' +
      (itemsStr || "").replace(/"/g, '""') +
      '"';
    rows.push(line);
  });

  var csv = headers + rows.join("\n");
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "cafe-bills-" + getTodayDateString() + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Reset - clear bills only (keeps menu and tables)
function resetApp() {
  if (
    !confirm(
      "Delete ALL bills? Menu and table settings will be kept. Cannot be undone."
    )
  ) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);

  alert("All bills deleted. Refreshing...");
  location.reload();
}

/* ============================================
   EVENT LISTENERS - Run when page loads
   ============================================ */

document.addEventListener("DOMContentLoaded", function () {
  // Category buttons - load menu when clicked
  var categoryBtns = document.querySelectorAll(".category-btn");
  categoryBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      // Remove active from all, add to this one
      categoryBtns.forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      var category = btn.getAttribute("data-category");
      loadMenuItems(category);
    });
  });

  // Save Bill button
  document.getElementById("save-bill-btn").addEventListener("click", saveBill);

  // Clear Bill button
  document
    .getElementById("clear-bill-btn")
    .addEventListener("click", function () {
      clearBill();
    });

  // Navigation buttons
  document.querySelectorAll(".nav-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var section = btn.getAttribute("data-section");
      if (section === "pending") {
        loadPendingBills();
      } else if (section === "completed") {
        loadCompletedBills();
      } else if (section === "manage") {
        renderManageMenuDisplay();
        updateProductCategorySelect();
      } else if (section === "data") {
        // Data & Backup - no extra load needed
      }
      showSection(section + "-section");
    });
  });

  // Manage Menu buttons
  document
    .getElementById("add-category-btn")
    .addEventListener("click", addCategory);
  document
    .getElementById("add-product-btn")
    .addEventListener("click", addProduct);
  document.getElementById("add-table-btn").addEventListener("click", addTable);

  // Search inputs - filter bills as user types
  document
    .getElementById("pending-search-input")
    .addEventListener("input", loadPendingBills);
  document
    .getElementById("completed-search-input")
    .addEventListener("input", loadCompletedBills);

  // Data & Backup buttons
  document.getElementById("backup-btn").addEventListener("click", backupApp);
  document
    .getElementById("restore-file-input")
    .addEventListener("change", restoreApp);

  document
    .getElementById("clear-old-bills-btn")
    .addEventListener("click", clearOldBills);
  document
    .getElementById("export-csv-btn")
    .addEventListener("click", exportBillsCSV);
  document.getElementById("reset-app-btn").addEventListener("click", resetApp);

  // Complete Bill button (in bill detail view)
  document
    .getElementById("complete-bill-btn")
    .addEventListener("click", completeBill);

  // Cancel Bill button (for pending bills)
  document
    .getElementById("cancel-bill-btn")
    .addEventListener("click", function () {
      cancelPendingBill(viewingBillId);
    });

  // Back button - returns to the list we came from (pending or completed)
  document
    .getElementById("back-to-pending-btn")
    .addEventListener("click", function () {
      viewingBillId = null;
      if (viewingFromSection === "completed") {
        loadCompletedBills();
        showSection("completed-section");
      } else {
        loadPendingBills();
        showSection("pending-section");
      }
    });

  // Load category buttons, table dropdown, and product category select on start
  renderCategoryButtons();
  loadTableSelect();
  updateProductCategorySelect();

  // Load create section on start
  showSection("create-section");
});
