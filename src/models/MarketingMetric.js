const mongoose = require('mongoose');

const marketingMetricSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Facebook
    fb_TPE:    { type: Number, default: null },
    fb_Walrus: { type: Number, default: null },
    fb_Dayuan: { type: Number, default: null },
    fb_GSD:    { type: Number, default: null },
    // Instagram
    ig_TPE:    { type: Number, default: null },
    ig_Walrus: { type: Number, default: null },
    ig_Dayuan: { type: Number, default: null },
    // YouTube
    yt: { type: Number, default: null },
    // TikTok
    tt_TPE:       { type: Number, default: null },
    tt_Walrus:    { type: Number, default: null },
    tt_Dayuan:    { type: Number, default: null },
    tt_center:    { type: Number, default: null },
    tt_changpump: { type: Number, default: null },
    tt_pumpAI:    { type: Number, default: null },
    tt_GSD:       { type: Number, default: null },
    // Line OA
    line_TPE:  { type: Number, default: null },
    line_chang: { type: Number, default: null },
    // Shopee
    shopee_views:     { type: Number, default: null },
    shopee_products:  { type: Number, default: null },
    shopee_followers: { type: Number, default: null },
    // Lazada
    lazada_views:     { type: Number, default: null },
    lazada_products:  { type: Number, default: null },
    lazada_followers: { type: Number, default: null },
    // TikTok Shop (TPE)
    ttshop_views:     { type: Number, default: null },
    ttshop_products:  { type: Number, default: null },
    ttshop_followers: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MarketingMetric', marketingMetricSchema);
