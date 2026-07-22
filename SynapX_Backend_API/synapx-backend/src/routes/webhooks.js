// src/routes/webhooks.js
const router = require('express').Router()
const { prisma } = require('../config/prisma')
const logger = require('../utils/logger')

// Stripe webhook — body is raw buffer (set in server.js)
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature']
  if (!process.env.STRIPE_SECRET_KEY?.includes('your_')) {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      logger.warn('Stripe webhook signature failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { paymentId } = session.metadata || {}
      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data:  { status: 'PAID', paidAt: new Date(), gatewayRef: session.payment_intent },
        })
        logger.info(`Stripe payment confirmed: ${paymentId}`)
      }
    }
  }
  res.json({ received: true })
})

module.exports = router
