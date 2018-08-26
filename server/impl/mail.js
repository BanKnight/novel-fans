const mailer = require("nodemailer")

const config = global.config

const server = global.server

const me = server.get("mail")
const data = me.data

me.start = function ()
{
    if (config.mail_sender == null)
    {
        return
    }

    data.transporter = mailer.createTransport(config.mail_sender)

    return true
}


me.send = function (target, subject, text)
{
    if (data.transporter == null)
    {
        console.error("sending mail faile,please set the mail sender", target, subject, text)
        return
    }

    const option = {
        from: config.mail_sender.auth.user,
        to: target,
        subject: subject,
        text: text,
    }

    data.transporter.sendMail(option, function (err, info)
    {
        if (err)
        {
            return logs.debug(err);
        }
        console.error(`Message sent:`, info.messageId)
    })
}

me.send_html = function (target, subject, html)
{
    if (data.transporter == null)
    {
        console.error("sending mail faile,please set the mail sender", target, subject, html)
        return
    }

    const option = {
        from: config.mail_sender.auth.user,
        to: target,
        subject: subject,
        html: html,
    }

    data.transporter.sendMail(option, function (err, info)
    {
        if (err)
        {
            return logs.debug(err);
        }
        console.error(`Message sent:`, info.messageId)
    })
}