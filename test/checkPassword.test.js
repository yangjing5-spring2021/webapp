"use strict";

const { expect } = require('chai');
const { checkPassword } = require('../userData');

describe('Check Password Test', () => {
    it('should return error1', () => {
        const password1 = "123";
        const error1 = "Password length must be longer than 8 letters";
        const error = checkPassword(password1);
        expect(error).to.equal(error1);
    });

    it('should return error2', () => {
        const password2 = "^skdjfhskdjfh^^@";
        const error2 = "Password can only contain 0-9, a-z, A-Z, !, ?, #, $, _, -.";
        const error = checkPassword(password2);
        expect(error).to.equal(error2);
    });

    it('should return error3', () => {
        const password3 = "skdjfhskdfjhg";
        const error3 = "Password must contain at least 1 number 0-9.";
        const error = checkPassword(password3);
        expect(error).to.equal(error3);
    });

    it('should return error4', () => {
        const password4 = "12SKDFJHGSKDFJHG";
        const error4 = "Password must contain at least 1 lowercase letter a-z.";
        const error = checkPassword(password4);
        expect(error).to.equal(error4);
    });

    it('should return error5', () => {
        const password5 = "12skdjfhskdfjhg";
        const error5 = "Password must contain at least 1 uppercase letter A-Z.";
        const error = checkPassword(password5);
        expect(error).to.equal(error5);
    });

    it('should return error6', () => {
        const password6 = "skdjfhSKDFJHG12";
        const error6 = "Password must contain at least 1 special character !, ?, #, $, _, -.";
        const error = checkPassword(password6);
        expect(error).to.equal(error6);
    });

    it('should return success', () => {
        const password7 = "skdjfhSKDFJHG12!!";
        let error7;
        const error = checkPassword(password7);
        expect(error).to.equal(error7);
    });
   });