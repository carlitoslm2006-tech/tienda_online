const PRODUCT_URL = "products.json";
const CATEGORY_URL = "categories.json";
const CART_STORAGE_KEY = "pixelshop-cart";

const productGrid = document.querySelector("#product-grid");
const categoryList = document.querySelector("#category-list");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const loadError = document.querySelector("#load-error");
const cartDialog = document.querySelector("#cart-dialog");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartFooter = document.querySelector("#cart-footer");
const cartTotal = document.querySelector("#cart-total");
const cartCount = document.querySelector("#cart-count");
const toast = document.querySelector("#toast");

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR"
});

let products = [];
let categories = [];
let activeCategory = "todos";
let cart = loadCart();
let toastTimeout;

function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(savedCart)) {
      throw new TypeError("El contenido guardado no es una lista.");
    }

    return savedCart.filter((item) =>
      item &&
      typeof item.id === "string" &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    );
  } catch (error) {
    console.error("No se pudo recuperar la cesta guardada:", error);
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("No se pudo guardar la cesta:", error);
    showToast("No se pudo guardar la cesta en este navegador.");
  }
}

async function loadStoreData() {
  try {
    let loadedProducts;
    let loadedCategories;

    if (window.location.protocol === "file:") {
      loadedProducts = JSON.parse(document.querySelector("#products-data").textContent);
      loadedCategories = JSON.parse(document.querySelector("#categories-data").textContent);
    } else {
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch(PRODUCT_URL),
        fetch(CATEGORY_URL)
      ]);

      if (!productsResponse.ok || !categoriesResponse.ok) {
        throw new Error("No se han podido cargar los archivos del catálogo.");
      }

      [loadedProducts, loadedCategories] = await Promise.all([
        productsResponse.json(),
        categoriesResponse.json()
      ]);
    }

    if (!Array.isArray(loadedProducts) || !Array.isArray(loadedCategories)) {
      throw new TypeError("El formato de los datos de la tienda no es válido.");
    }

    products = loadedProducts;
    categories = loadedCategories;
    renderCategories();
    renderProducts();
    renderCart();
  } catch (error) {
    console.error("Error al iniciar la tienda:", error);
    loadError.hidden = false;
    loadError.textContent = "No se pudo cargar el catálogo. Comprueba que los archivos de la tienda estén completos.";
  }
}

function renderCategories() {
  categoryList.replaceChildren();

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-button";
    button.dataset.category = category.id;
    button.setAttribute("aria-pressed", String(category.id === activeCategory));

    const icon = document.createElement("span");
    icon.className = "category-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = category.icon;

    const label = document.createElement("span");
    label.textContent = category.name;

    button.append(icon, label);
    categoryList.append(button);
  });
}

function getVisibleProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  const visibleProducts = products.filter((product) => {
    const matchesCategory = activeCategory === "todos" || product.category === activeCategory;
    const matchesSearch = `${product.name} ${product.description}`.toLocaleLowerCase("es").includes(query);
    return product.stock > 0 && matchesCategory && matchesSearch;
  });

  switch (sortSelect.value) {
    case "price-asc":
      visibleProducts.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      visibleProducts.sort((a, b) => b.price - a.price);
      break;
    case "name":
      visibleProducts.sort((a, b) => a.name.localeCompare(b.name, "es"));
      break;
    default:
      visibleProducts.sort((a, b) => products.indexOf(a) - products.indexOf(b));
  }

  return visibleProducts;
}

function renderProducts() {
  const visibleProducts = getVisibleProducts();
  productGrid.replaceChildren();
  resultCount.textContent = `${visibleProducts.length} ${visibleProducts.length === 1 ? "juego disponible" : "juegos disponibles"}`;
  emptyState.hidden = visibleProducts.length > 0;

  visibleProducts.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.style.setProperty("--card-delay", `${index * 45}ms`);

    const cover = document.createElement("div");
    cover.className = `product-cover theme-${product.theme}`;
    cover.setAttribute("aria-label", `Ilustración de ${product.name}`);

    const coverTop = document.createElement("div");
    coverTop.className = "cover-topline";
    coverTop.innerHTML = "<span>PV / GAME STORE</span><span>◆ 2025</span>";

    const art = document.createElement("span");
    art.className = "game-art";
    art.setAttribute("aria-hidden", "true");
    art.textContent = product.art;

    const coverTitle = document.createElement("span");
    coverTitle.className = "cover-title";
    coverTitle.textContent = product.name;
    cover.append(coverTop, art, coverTitle);

    if (product.badge) {
      const badge = document.createElement("span");
      badge.className = "product-badge";
      badge.textContent = product.badge;
      cover.append(badge);
    }

    const details = document.createElement("div");
    details.className = "product-details";

    const category = categories.find((item) => item.id === product.category);
    const categoryName = document.createElement("p");
    categoryName.className = "product-category";
    categoryName.textContent = category ? category.name : "Videojuego";

    const name = document.createElement("h3");
    name.textContent = product.name;

    const description = document.createElement("p");
    description.className = "product-description";
    description.textContent = product.description;

    const productBottom = document.createElement("div");
    productBottom.className = "product-bottom";

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = currency.format(product.price);

    const addButton = document.createElement("button");
    addButton.className = "add-button";
    addButton.type = "button";
    addButton.dataset.addToCart = product.id;
    addButton.setAttribute("aria-label", `Añadir ${product.name} a la cesta`);
    addButton.innerHTML = '<span>Añadir</span><span aria-hidden="true">+</span>';

    productBottom.append(price, addButton);
    details.append(categoryName, name, description, productBottom);
    card.append(cover, details);
    productGrid.append(card);
  });
}

function renderCart() {
  cartItems.replaceChildren();
  let totalItems = 0;
  let totalPrice = 0;
  const validCart = [];

  cart.forEach((item) => {
    const product = products.find((entry) => entry.id === item.id);
    if (!product || product.stock < 1) {
      return;
    }

    const quantity = Math.min(item.quantity, product.stock);
    validCart.push({ id: item.id, quantity });
    totalItems += quantity;
    totalPrice += product.price * quantity;

    const row = document.createElement("article");
    row.className = "cart-item";

    const thumb = document.createElement("div");
    thumb.className = `cart-thumb theme-${product.theme}`;
    thumb.setAttribute("aria-hidden", "true");
    thumb.textContent = product.art;

    const info = document.createElement("div");
    info.className = "cart-item-info";

    const name = document.createElement("h3");
    name.textContent = product.name;

    const price = document.createElement("p");
    price.textContent = currency.format(product.price);

    const controls = document.createElement("div");
    controls.className = "quantity-controls";

    const decrease = createCartAction("−", "decrease", product.id, `Reducir cantidad de ${product.name}`);
    const quantityLabel = document.createElement("span");
    quantityLabel.textContent = String(quantity);
    quantityLabel.setAttribute("aria-label", `Cantidad: ${quantity}`);
    const increase = createCartAction("+", "increase", product.id, `Aumentar cantidad de ${product.name}`);
    increase.disabled = quantity >= product.stock;
    controls.append(decrease, quantityLabel, increase);

    const remove = createCartAction("Quitar", "remove", product.id, `Quitar ${product.name} de la cesta`);
    remove.className = "remove-button";

    info.append(name, price, controls);
    row.append(thumb, info, remove);
    cartItems.append(row);
  });

  if (validCart.length !== cart.length || validCart.some((item, index) => item.quantity !== cart[index].quantity)) {
    cart = validCart;
    saveCart();
  }

  cartCount.textContent = String(totalItems);
  cartCount.setAttribute("aria-label", `${totalItems} ${totalItems === 1 ? "artículo" : "artículos"}`);
  cartTotal.textContent = currency.format(totalPrice);
  cartEmpty.hidden = totalItems > 0;
  cartFooter.hidden = totalItems === 0;
}

function createCartAction(label, action, productId, accessibleName) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.cartAction = action;
  button.dataset.productId = productId;
  button.setAttribute("aria-label", accessibleName);
  button.textContent = label;
  return button;
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product || product.stock < 1) {
    return;
  }

  const cartItem = cart.find((item) => item.id === productId);
  if (cartItem) {
    if (cartItem.quantity >= product.stock) {
      showToast(`No quedan más unidades de ${product.name}.`);
      return;
    }
    cartItem.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }

  saveCart();
  renderCart();
  showToast(`${product.name} añadido a la cesta.`);
}

function updateCart(productId, action) {
  const itemIndex = cart.findIndex((entry) => entry.id === productId);
  if (itemIndex === -1) {
    return;
  }

  if (action === "remove") {
    cart.splice(itemIndex, 1);
  } else if (action === "decrease") {
    cart[itemIndex].quantity -= 1;
    if (cart[itemIndex].quantity <= 0) {
      cart.splice(itemIndex, 1);
    }
  } else if (action === "increase") {
    const product = products.find((entry) => entry.id === productId);
    if (product && cart[itemIndex].quantity < product.stock) {
      cart[itemIndex].quantity += 1;
    }
  }

  saveCart();
  renderCart();
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("toast-visible");
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("toast-visible");
  }, 3000);
}

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) {
    return;
  }
  activeCategory = button.dataset.category;
  categoryList.querySelectorAll("[data-category]").forEach((categoryButton) => {
    categoryButton.setAttribute("aria-pressed", String(categoryButton === button));
  });
  renderProducts();
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-to-cart]");
  if (button) {
    addToCart(button.dataset.addToCart);
  }
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart-action]");
  if (button) {
    updateCart(button.dataset.productId, button.dataset.cartAction);
  }
});

searchInput.addEventListener("input", renderProducts);
sortSelect.addEventListener("change", renderProducts);

document.querySelector("#open-cart").addEventListener("click", () => cartDialog.showModal());
document.querySelector("#close-cart").addEventListener("click", () => cartDialog.close());
document.querySelector("#continue-shopping").addEventListener("click", () => cartDialog.close());
cartDialog.addEventListener("click", (event) => {
  if (event.target === cartDialog) {
    cartDialog.close();
  }
});

document.querySelector("#checkout-button").addEventListener("click", () => {
  if (cart.length === 0) {
    return;
  }
  cart = [];
  saveCart();
  renderCart();
  cartDialog.close();
  showToast("¡Compra de demostración completada! Gracias por jugar.");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

loadStoreData();
