window.loadBuyMeACoffeeButton = function () {
    if (document.getElementById('bmc-button-script')) return;
    var script = document.createElement('script');
    script.id = 'bmc-button-script';
    script.type = 'text/javascript';
    script.src = 'https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js';
    script.setAttribute('data-name', 'bmc-button');
    script.setAttribute('data-slug', 'hesspet');
    script.setAttribute('data-color', '#FFDD00');
    script.setAttribute('data-emoji', '');
    script.setAttribute('data-font', 'Cookie');
    script.setAttribute('data-text', 'Kaufe Nasreddin eine Kaffee!');
    script.setAttribute('data-outline-color', '#000000');
    script.setAttribute('data-font-color', '#000000');
    script.setAttribute('data-coffee-color', '#ffffff');
    document.body.appendChild(script);
};
