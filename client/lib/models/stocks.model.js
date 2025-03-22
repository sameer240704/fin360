import { model, Schema, models } from "mongoose";

const StockHoldingSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    stockName: {
        type: String,
        required: true,
        trim: true
    },
    tickerSymbol: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    numberOfShares: {
        type: String,
        required: true,
        min: 0
    },
    purchasePrice: {
        type: String,
        required: true,
        min: 0
    },
    purchaseDate: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const StockHolding = models?.StockHolding || model('StockHolding', StockHoldingSchema);

export default StockHolding;