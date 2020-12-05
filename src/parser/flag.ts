/**
 * The prefix used for long flags
 */
export const LONG_FLAG_PREFIX = '--';

/**
 * The prefix used for short flags
 */
export const SHORT_FLAG_PREFIX = '-';

/**
 * The prefix used for negated flags
 */
export const NEGATED_FLAG_PREFIX = '--no-';

/**
 * A RegExp to test if a string is a long flag
 */
export const LONG_FLAG_REGEXP = /^--(\D[^\s]*)/;

/**
 * A RegExp to test if a string is a short flag
 *
 * @remarks
 * This RegExp checks for a non-digit-character after the flag to differentiate
 * between a short flag, e.g. '-h', and a negative number, e.g. '-1'.
 */
export const SHORT_FLAG_REGEXP = /^-(\D)/;

/**
 * A RegExp to test if a string is a negated flag
 */
export const NEGATED_FLAG_REGEXP = /^--no-(\D[^\s]*)/;

/**
 * Tests if a string is a flag
 *
 * @param value - The string to test
 */
export function isFlag (value: string): boolean {

    return LONG_FLAG_REGEXP.test(value) || SHORT_FLAG_REGEXP.test(value);
}

/**
 * Tests if a string is a long flag
 *
 * @param value - The string to test
 */
export function isLongFlag (value: string): boolean {

    return LONG_FLAG_REGEXP.test(value);
}

/**
 * Tests if a string is a short flag
 *
 * @param value - The string to test
 */
export function isShortFlag (value: string): boolean {

    return SHORT_FLAG_REGEXP.test(value);
}

/**
 * Tests if a string is a negated flag
 *
 * @param value - The string to test
 */
export function isNegatedFlag (value: string): boolean {

    return NEGATED_FLAG_REGEXP.test(value);
}
