"use server";

import User from "@/lib/models/user.model";
import { connect } from "@/lib/mongo.db";

export async function createUser(user) {
  try {
    await connect();

    const existingUser = await User.findOne({ clerkId: user.clerkId });
    if (existingUser) {
      console.log("User already exists:", existingUser);
      return existingUser;
    }

    const newUser = await User.create(user);

    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function updateUser(userId, updateData) {
  try {
    await connect();

    const formattedUpdateData = {};

    if (updateData.phoneNumber) formattedUpdateData.phoneNumber = updateData.phoneNumber;
    if (updateData.dateOfBirth) formattedUpdateData.dateOfBirth = updateData.dateOfBirth;

    if (updateData.address) {
      formattedUpdateData.address = {};
      const { street, city, state, country, postalCode } = updateData.address;

      if (street) formattedUpdateData.address.street = street;
      if (city) formattedUpdateData.address.city = city;
      if (state) formattedUpdateData.address.state = state;
      if (country) formattedUpdateData.address.country = country;
      if (postalCode) formattedUpdateData.address.postalCode = postalCode;
    }

    if (updateData.financialProfile) {
      formattedUpdateData.financialProfile = {};
      const { accountType, riskTolerance, investmentGoals, preferredCurrency } = updateData.financialProfile;

      if (accountType) formattedUpdateData.financialProfile.accountType = accountType;
      if (riskTolerance) formattedUpdateData.financialProfile.riskTolerance = riskTolerance;
      if (investmentGoals) formattedUpdateData.financialProfile.investmentGoals = investmentGoals;
      if (preferredCurrency) formattedUpdateData.financialProfile.preferredCurrency = preferredCurrency;
    }

    if (updateData.preferences) {
      formattedUpdateData.preferences = {};

      if (updateData.preferences.notifications) {
        formattedUpdateData.preferences.notifications = {};
        const { email, sms, inApp } = updateData.preferences.notifications;

        if (email !== undefined) formattedUpdateData.preferences.notifications.email = email;
        if (sms !== undefined) formattedUpdateData.preferences.notifications.sms = sms;
        if (inApp !== undefined) formattedUpdateData.preferences.notifications.inApp = inApp;
      }

      if (updateData.preferences.dataVisualization) {
        formattedUpdateData.preferences.dataVisualization = updateData.preferences.dataVisualization;
      }

      if (updateData.preferences.aiAssistanceLevel) {
        formattedUpdateData.preferences.aiAssistanceLevel = updateData.preferences.aiAssistanceLevel;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: formattedUpdateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return JSON.parse(JSON.stringify(updatedUser));
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

export async function getUserDetails(userId) {
  try {
    await connect();

    const newUser = await User.findById(userId);

    if (!newUser) {
      throw new Error("User not found");
    }

    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}
