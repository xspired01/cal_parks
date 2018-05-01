'use strict';

module.exports = escapeRegex;

/**
 * Escapes the RegExp special characters "^", "$", "\", "/", ".", "*", "+", "?",
 * "(", ")", "[", "]", "{", "}", "|", ":", "!", and "=" in string.
 *
 * @param {String} string
 * @return {String}
 * @api public
 */

function escapeRegex(string){
    return ('' + string).replace(/([?!${}*:()|=^[\]\/\\.+])/g, '\\$1');
}