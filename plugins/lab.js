const { ezra } = require('../fredi/ezra');
const fs = require('fs').promises;
const path = require('path');

// File path for storing bookings
const bookingsFilePath = path.join(__dirname, '../data/lab_bookings.json');

// Helper function to load bookings
async function loadBookings() {
  try {
    const data = await fs.readFile(bookingsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return empty bookings object
    return { bookings: [] };
  }
}

// Helper function to save bookings
async function saveBookings(bookingsData) {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(bookingsFilePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Save bookings to file
    await fs.writeFile(bookingsFilePath, JSON.stringify(bookingsData, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving bookings:", error);
    return false;
  }
}

// Format date to YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

ezra({
  nomCom: "lab",
  categorie: "Fredi-Booking",
  desc: "Lab booking system for customers",
  reaction: "🧪",
}, async (dest, zk, commandeOptions) => {
  const { repondre, ms, args } = commandeOptions;
  
  if (!args[0]) {
    return repondre(
      "*Lab Booking System*\n\n" +
      "Available commands:\n" +
      "- *book [name] [date] [time] [lab-type]* - Book a lab slot\n" +
      "- *view* - View all bookings\n" +
      "- *cancel [booking-id]* - Cancel a booking\n" +
      "- *status [booking-id]* - Check booking status\n\n" +
      "Example: lab book John 2025-05-20 14:00 chemistry"
    );
  }

  const action = args[0].toLowerCase();

  try {
    // Load existing bookings
    const bookingsData = await loadBookings();
    
    switch (action) {
      case "book":
        // Check if all required arguments are provided
        if (args.length < 5) {
          return repondre("*Please provide all required information:* name, date, time, and lab-type");
        }
        
        const name = args[1];
        const date = args[2];
        const time = args[3];
        const labType = args[4];
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return repondre("*Invalid date format.* Please use YYYY-MM-DD format.");
        }
        
        // Validate time format (HH:MM)
        if (!/^\d{1,2}:\d{2}$/.test(time)) {
          return repondre("*Invalid time format.* Please use HH:MM format.");
        }
        
        // Generate booking ID
        const bookingId = `LAB${Date.now().toString().slice(-6)}`;
        
        // Create new booking
        const newBooking = {
          id: bookingId,
          customerName: name,
          date,
          time,
          labType,
          status: "confirmed",
          bookingTime: new Date().toISOString()
        };
        
        // Add booking to the list
        bookingsData.bookings.push(newBooking);
        
        // Save updated bookings
        const saved = await saveBookings(bookingsData);
        
        if (saved) {
          return repondre(
            "*✅ Lab Booking Confirmed!*\n\n" +
            `*Booking ID:* ${bookingId}\n` +
            `*Customer:* ${name}\n` +
            `*Date:* ${date}\n` +
            `*Time:* ${time}\n` +
            `*Lab Type:* ${labType}\n\n` +
            "To check status, use: lab status " + bookingId
          );
        } else {
          return repondre("*⚠️ Failed to save booking. Please try again.*");
        }
        
      case "view":
        // Check if there are any bookings
        if (!bookingsData.bookings || bookingsData.bookings.length === 0) {
          return repondre("*No bookings found.*");
        }
        
        // Generate response with all bookings
        let response = "*📋 Lab Bookings List*\n\n";
        
        bookingsData.bookings.forEach((booking, index) => {
          response += `*Booking #${index + 1}*\n` +
            `ID: ${booking.id}\n` +
            `Customer: ${booking.customerName}\n` +
            `Date: ${booking.date}\n` +
            `Time: ${booking.time}\n` +
            `Lab Type: ${booking.labType}\n` +
            `Status: ${booking.status}\n\n`;
        });
        
        return repondre(response);
        
      case "cancel":
        // Check if booking ID is provided
        if (!args[1]) {
          return repondre("*Please provide a booking ID to cancel.*");
        }
        
        const cancelId = args[1];
        const bookingIndex = bookingsData.bookings.findIndex(b => b.id === cancelId);
        
        if (bookingIndex === -1) {
          return repondre(`*Booking with ID ${cancelId} not found.*`);
        }
        
        // Update booking status to cancelled
        bookingsData.bookings[bookingIndex].status = "cancelled";
        
        // Save updated bookings
        const cancelSaved = await saveBookings(bookingsData);
        
        if (cancelSaved) {
          return repondre(`*✅ Booking ${cancelId} has been cancelled successfully.*`);
        } else {
          return repondre("*⚠️ Failed to cancel booking. Please try again.*");
        }
        
      case "status":
        // Check if booking ID is provided
        if (!args[1]) {
          return repondre("*Please provide a booking ID to check status.*");
        }
        
        const statusId = args[1];
        const booking = bookingsData.bookings.find(b => b.id === statusId);
        
        if (!booking) {
          return repondre(`*Booking with ID ${statusId} not found.*`);
        }
        
        return repondre(
          "*🔍 Booking Status*\n\n" +
          `*Booking ID:* ${booking.id}\n` +
          `*Customer:* ${booking.customerName}\n` +
          `*Date:* ${booking.date}\n` +
          `*Time:* ${booking.time}\n` +
          `*Lab Type:* ${booking.labType}\n` +
          `*Status:* ${booking.status}\n` +
          `*Booked on:* ${new Date(booking.bookingTime).toLocaleString()}`
        );
        
      default:
        return repondre("*Unknown command.* Use 'lab' without arguments to see available commands.");
    }
  } catch (error) {
    console.error("Error in lab booking system:", error);
    return repondre("*⚠️ An error occurred while processing your request. Please try again.*");
  }
});
