const nodemailer = require('nodemailer');
const pug = require('pug');
const juice = require('juice');
const htmlToText = require('html-to-text');
const promisify = require('es6-promisify');

const transport = nodemailer.createTransport({
    host:process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth:{
        user:process.env.MAIL_USER,
        pass:process.env.MAIL_PASS
    }
});

transport.sendMail({
    from: 'Amo Moloko <amomoloko@gmail.com>',
    to: 'messi@example.com',
    subject:'Just testing out!',
    html:'Hey I <strong>Admire</strong> you',
    text: 'Hey no html?'
});

const genereateHTML = (filename,options ={}) =>{
    const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`,options);
    const inlined = juice(html);
    return html;
}

exports.send = async (options) =>{
    const html = genereateHTML(options.filename, options);
    const text = htmlToText.fromString(html);
    const mailOptions ={
        from: `Amo Moloko <noreply@moloko.com`,
        to: options.user.email,
        subject: options.user.email,
        html,
        text
    };
    const sendMail = promisify(transport.sendMail, transport);
    return sendMail(mailOptions);
}