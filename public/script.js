const searchForm = document.getElementById("searchForm"); // Reference to the search form element
const searchInput = document.getElementById("searchInput"); // Reference to the search input element
const suggestionDropdown = document.getElementById("suggestionDropdown"); // Reference to the suggestion dropdown element
const cardInfoContainer = document.getElementById("cardInfoContainer"); // Reference to the card info container element
const cardImage = document.getElementById("cardImage"); // Reference to the card image element
let selectedIndex = -1; // Initialize the selected index variable

// EVENT LISTENERS -------------------------------------------------------------------------

// jQuery document ready function to initialize Select2 plugin
$(document).ready(function() {
    
    // Initialize Select2 plugin for search input
    $('#searchInput').select2({
        placeholder: "Enter card name",
        minimumInputLength: 1,
        ajax: {
            // URL for fetching autocomplete suggestions
            url: function(params) {
                return "https://api.scryfall.com/cards/autocomplete?q=" + encodeURIComponent(params.term);
            },
            dataType: 'json',
            delay: 150,
            // Process results from autocomplete API
            processResults: function(data) {
                return {
                    results: data.data.map(suggestion => ({
                        id: suggestion,
                        text: suggestion
                    }))
                };
            },
            cache: true
        }
    });

    // Event handler for when a suggestion is selected
    $('#searchInput').on('select2:select', function(e) {
        var cardName = e.params.data.text;
        searchCard(cardName);
    });
});

// Event listener for Select2 dropdown open
$(document).on('select2:open', () => {
    document.querySelector('.select2-search__field').focus(); // Focus on the search input when dropdown opens
});

// FUNCTIONS ----------------------------------------------------------------------------------

// Function to update the selected option in the suggestion dropdown
function updateSelectedOption() {
    for (let i = 0; i < suggestionDropdown.options.length; i++) {
        suggestionDropdown.options[i].selected = (i === selectedIndex);
    }
}

// Function to fetch autocomplete suggestions
function getSuggestions(inputValue) {
    let apiUrl = "https://api.scryfall.com/cards/autocomplete?q=" + encodeURIComponent(inputValue);
    
    fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        populateDropdown(data.data); // Populate suggestion dropdown with fetched data
    })
    .catch(error => {
        console.error('Error fetching suggestions:', error);
    });
}

// Function to clear suggestions from the dropdown
function clearSuggestions() {
    suggestionDropdown.innerHTML = "";
    suggestionDropdown.style.display = "none";
}

// Function to search for a card by name
function searchCard(cardName) {
    let apiUrl = "https://api.scryfall.com/cards/named?fuzzy=" + encodeURIComponent(cardName);
    
    fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        if (data.image_uris && data.image_uris.art_crop) {
            setBodyBackground(data.image_uris.art_crop); // Set background image of body
            displayCardInfo(data); // Display card information
            displayCardImage(data.image_uris.png); // Display card image
            applyMagnifyPlugin(); // Apply Magnify plugin for image zoom
        } else {
            displayErrorMessage("Art crop image not found");
        }
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        displayErrorMessage("Error fetching card data");
    });
}

// Function to set background image of the body
function setBodyBackground(imageUrl) {
    document.getElementById("backgroundContainer").style.backgroundImage = `url("${imageUrl}")`;
}

// Function to display card image
function displayCardImage(imageUrl) {
    cardImage.src = imageUrl; // Set the src attribute dynamically
    cardImage.dataset.magnifySrc = imageUrl; // Update the data-magnify-src attribute
    cardImage.onload = function() {
        applyMagnifyPlugin(); // Call the function to apply the Magnify plugin after the image is loaded
    };
}

// Function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to display card information
function displayCardInfo(data) {
    cardInfoContainer.innerHTML = ""; // Clear previous content
    const table = document.createElement("table");
    table.id = "cardInfoTable";
    const tbody = document.createElement("tbody");
    
    // Add rows and data to the table
    const rows = [
        { label: "Card Name", value: data.name || "-"},
        { label: "Set", value: data.set_name || "-" },
        { label: "Rarity", value: capitalizeFirstLetter(data.rarity) || "-" },
        { label: "Number in Set", value: "#" + data.collector_number || "-" },
        { label: "Artist", value: data.artist || "-" },
        { label: "Release Date", value: data.released_at || "-" },
        { label: "Keywords", value: data.keywords || "-"},
        { label: "Current Prices", value: getCurrentPrices(data) }
    ];

    rows.forEach(row => {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        const td = document.createElement("td");
        th.textContent = row.label;
        th.style.textShadow = "2px 2px black";
        td.textContent = row.value;
        if (row.label === "Rarity") {
            td.style.color = getRarityColor(row.value); // Set text color based on rarity
            td.classList.add("shiny-text");
            td.style.background = "black";
        }
        tr.appendChild(th);
        tr.appendChild(td);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    cardInfoContainer.appendChild(table);
}

// Function to get color based on rarity
function getRarityColor(rarity) {
    switch (rarity.toLowerCase()) {
        case "common":
            return "white";
        case "uncommon":
            return "#7294b6";
        case "rare":
            return "gold";
        case "mythic":
            return "orangered";
        default:
            return "white"; 
    }
}

// Function to get current prices
function getCurrentPrices(data) {
    if (data.prices) {
        let prices = "";
        if (data.prices.usd) {
            prices += "$" + data.prices.usd + " // ";
        }
        if (data.prices.eur) {
            prices += "€" + data.prices.eur + " ";
        }
        return prices.trim() || "-";
    } else {
        return "-";
    }
}

// Function to display error message
function displayErrorMessage(message) {
    cardImage.innerHTML = `<p>${message}</p>`;
}

// Function to position the suggestion dropdown
function positionDropdown() {
    const searchContainer = document.getElementById("searchContainer");
    suggestionDropdown.style.left = searchContainer.offsetLeft + "px";
    suggestionDropdown.style.top = (searchContainer.offsetTop + searchContainer.offsetHeight) + "px";
    suggestionDropdown.style.width = get

ComputedStyle(searchContainer).width; // Get computed width of search bar
}

// Function to apply the Magnify plugin for image zoom
function applyMagnifyPlugin() {
    $(".zoom").magnify({
        magnifiedWidth: 2000, // Adjust the magnifiedWidth option to increase zoom level horizontally
        magnifiedHeight: 2800,
        onMagnifedOpen: function() {
            document.body.classList.add('magnify-active'); // Add magnify-active class to body
        },
        onMagnifiedClose: function() {
            document.body.classList.remove('magnify-active'); // Remove magnify-active class from body
        }
    });
}
