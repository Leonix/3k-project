(function() { "use strict";

    // maps input[type="color"] to a tooltip near that input
    const tooltip_storage = new WeakMap();

    // We use a single colorpicker instance and move it between several tooltips
    var colorpicker;
    let $colorpicker_wrapper;
    var $current_tt_wrapper;
    var $current_input;

    window.addEventListener('load', function () {

        $colorpicker_wrapper = document.querySelector('#colorpicker-wrapper');

        document.querySelector('#settings').addEventListener('click', (event) => {

            // When user clicks on a input[type="color"] show custom color picker instead of native one
            var $input = event.target.closest('input[type="color"]');
            if ($input) {
                return handleInputTypeColorClick(event, $input);
            }

            // When user clicks outside of a colorpicker, close active tooltip if opened
            if ($current_tt_wrapper && !event.target.closest('#colorpicker-wrapper') && event.target.closest('body')) {
                $current_tt_wrapper.style.display = 'none';
                $current_tt_wrapper = null;
            }
        });
    });

    function handleInputTypeColorClick(event, $input) {

        // Hide current tooltip
        if ($current_tt_wrapper) {
            $current_tt_wrapper.style.display = 'none';
        }

        // Create colorpicker if not initialized yet, then attach to a given $input
        if (!colorpicker) {
            colorpicker = createColorpicker($colorpicker_wrapper);
        }
        colorpicker.setColor($input.value);
        $current_input = $input;

        // Create tooltip near current $input unless exists.
        // Move colorpicker inside active tooltip and recalculate tooltip positioning.
        if (!tooltip_storage.has($input)) {
            tooltip_storage.set($input, createTooltipForInput($input));
        }
        let popper;
        [$current_tt_wrapper, popper] = tooltip_storage.get($input);
        $current_tt_wrapper.append($colorpicker_wrapper);
        $current_tt_wrapper.style.display = '';
        popper.update();

        // suppress native color picker
        event.preventDefault();
        return false;
    }

    function createTooltipForInput($input) {
        // Create a DOM node for the tooltip
        const template = document.createElement('template');
        template.innerHTML = '<div id="pop" role="tooltip"><div x-arrow></div></div>';
        const $tt_wrapper = template.content.children[0];
        $input.after($tt_wrapper);

        // Create a Popper
        return [$tt_wrapper, Popper.createPopper($input, $tt_wrapper, {
            placement: 'bottom'
        })];
    }

    function createColorpicker($colorpicker_wrapper) {

        const $hint = $colorpicker_wrapper.querySelector('.a-color-picker-hint');

        var acp = AColorPicker.createPicker($colorpicker_wrapper, {
            color: '#000000',
            showHSL: false,
            palette: loadPaletteFromStorage(),
            paletteEditable: true
        });

        $colorpicker_wrapper.querySelector('.a-color-picker-palette').after($hint);

        // Throttle change event on $current_input
        var timeout;

        // When user selects color in colorpicker, update current input[type="color"]
        acp.on('change', (p, color) => {

            if (timeout) {
                clearTimeout(timeout);
            }
            if ($current_input) {
                timeout = setTimeout(function() {
                    if ($current_input) {
                        $current_input.value = acp.color;
                        $current_input.dispatchEvent(new Event('change', {bubbles: true}));
                    }
                }, 100);
            }
        });

        // When user adds or removes color from palette, remember state in persistent storage
        acp.on('coloradd', savePaletteToStorage);
        acp.on('colorremove', savePaletteToStorage);

        return acp;
    }

    function savePaletteToStorage(acp) {
        localStorage.setItem('color_palette', JSON.stringify(acp.palette));
    }

    function loadPaletteFromStorage() {
        try {
            return JSON.parse(localStorage.getItem('color_palette')) || 'PALETTE_MATERIAL_CHROME';
        } catch (e) {
            return 'PALETTE_MATERIAL_CHROME';
        }
    }

}());