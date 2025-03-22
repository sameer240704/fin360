"use server";

import StockHolding from '../models/stocks.model';
import { revalidatePath } from 'next/cache';
import { connect } from '../mongo.db';
import { decryptObject, encryptObject } from '../helpers/security.helper';

export async function addStock(userId, stockData) {
    try {
        await connect();

        const encryptedStockData = encryptObject({
            stockName: stockData.stockName,
            tickerSymbol: stockData.tickerSymbol,
            numberOfShares: stockData.numberOfShares,
            purchasePrice: stockData.purchasePrice,
            purchaseDate: stockData.purchaseDate
        });

        const newStock = new StockHolding({
            userId,
            ...encryptedStockData
        });

        await newStock.save();

        revalidatePath('/my-portfolio');

        return { success: true, message: "Stock added successfully" };
    } catch (error) {
        console.error('Error adding stock:', error);
        return {
            success: false,
            error: error.message || 'Failed to add stock'
        };
    }
}

export async function fetchAllStocks(userId) {
    try {
        await connect();

        const stocks = await StockHolding.find({ userId: userId })
            .sort({ createdAt: -1 })
            .lean();

        const decryptedStocks = stocks.map(stock => {
            const { _id, userId, createdAt, updatedAt, purchaseDate, ...encryptedFields } = stock;

            const decryptedData = decryptObject(encryptedFields);

            return {
                _id: _id.toString(),
                userId: userId.toString(),
                createdAt: createdAt.toISOString(),
                updatedAt: updatedAt.toISOString(),
                purchaseDate: purchaseDate instanceof Date ? purchaseDate.toISOString() : purchaseDate,
                ...decryptedData
            };
        });

        return { success: true, data: decryptedStocks };
    } catch (error) {
        console.error('Error fetching stocks:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch stocks'
        };
    }
}
