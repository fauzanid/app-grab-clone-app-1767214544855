import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Existing rides endpoints
router.get('/rides', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM rides ORDER BY created_at DESC');
    const rides = stmt.all();
    res.json(rides);
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

router.post('/rides', (req, res) => {
  try {
    const { pickup, destination, status = 'pending' } = req.body;
    
    if (!pickup || !destination) {
      return res.status(400).json({ error: 'Pickup and destination are required' });
    }
    
    const stmt = db.prepare('INSERT INTO rides (pickup, destination, status) VALUES (?, ?, ?)');
    const result = stmt.run(pickup, destination, status);
    
    const newRide = {
      id: result.lastInsertRowid,
      pickup,
      destination,
      status,
      driver_id: null,
      created_at: new Date().toISOString()
    };
    
    res.status(201).json(newRide);
  } catch (error) {
    console.error('Error creating ride:', error);
    res.status(500).json({ error: 'Failed to create ride' });
  }
});

router.post('/rides/:id/accept', (req, res) => {
  try {
    const { id } = req.params;
    const { driver_id } = req.body;
    
    if (!driver_id) {
      return res.status(400).json({ error: 'Driver ID is required' });
    }
    
    const stmt = db.prepare('UPDATE rides SET status = ?, driver_id = ? WHERE id = ?');
    const result = stmt.run('accepted', driver_id, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    const getRide = db.prepare('SELECT * FROM rides WHERE id = ?');
    const updatedRide = getRide.get(id);
    
    res.json(updatedRide);
  } catch (error) {
    console.error('Error accepting ride:', error);
    res.status(500).json({ error: 'Failed to accept ride' });
  }
});

router.post('/rides/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare('UPDATE rides SET status = ? WHERE id = ?');
    const result = stmt.run('completed', id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    const getRide = db.prepare('SELECT * FROM rides WHERE id = ?');
    const updatedRide = getRide.get(id);
    
    res.json(updatedRide);
  } catch (error) {
    console.error('Error completing ride:', error);
    res.status(500).json({ error: 'Failed to complete ride' });
  }
});

// Existing drivers endpoints
router.get('/drivers', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM drivers ORDER BY created_at DESC');
    const drivers = stmt.all();
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

router.post('/drivers', (req, res) => {
  try {
    const { name, status = 'available' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const stmt = db.prepare('INSERT INTO drivers (name, status) VALUES (?, ?)');
    const result = stmt.run(name, status);
    
    const newDriver = {
      id: result.lastInsertRowid,
      name,
      status,
      created_at: new Date().toISOString()
    };
    
    res.status(201).json(newDriver);
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// Hotels API endpoints
router.get('/hotels', (req, res) => {
  try {
    const { location, min_price, max_price } = req.query;
    let query = 'SELECT * FROM hotels WHERE available_rooms > 0';
    const params = [];
    
    if (location) {
      query += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    
    if (min_price) {
      query += ' AND price_per_night >= ?';
      params.push(parseFloat(min_price));
    }
    
    if (max_price) {
      query += ' AND price_per_night <= ?';
      params.push(parseFloat(max_price));
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = db.prepare(query);
    const hotels = stmt.all(...params);
    res.json(hotels);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

router.post('/hotels', (req, res) => {
  try {
    const { name, location, price_per_night, rating = 4.0, amenities = '', description = '', available_rooms = 10 } = req.body;
    
    if (!name || !location || !price_per_night) {
      return res.status(400).json({ error: 'Name, location, and price per night are required' });
    }
    
    if (price_per_night <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO hotels (name, location, price_per_night, rating, amenities, description, available_rooms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(name, location, price_per_night, rating, amenities, description, available_rooms);
    
    const newHotel = {
      id: result.lastInsertRowid,
      name,
      location,
      price_per_night,
      rating,
      amenities,
      description,
      available_rooms,
      created_at: new Date().toISOString()
    };
    
    res.status(201).json(newHotel);
  } catch (error) {
    console.error('Error creating hotel:', error);
    res.status(500).json({ error: 'Failed to create hotel' });
  }
});

router.delete('/hotels/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare('DELETE FROM hotels WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    
    res.json({ message: 'Hotel deleted successfully' });
  } catch (error) {
    console.error('Error deleting hotel:', error);
    res.status(500).json({ error: 'Failed to delete hotel' });
  }
});

// Book hotel room
router.post('/hotels/:id/book', (req, res) => {
  try {
    const { id } = req.params;
    const { nights = 1 } = req.body;
    
    const getHotel = db.prepare('SELECT * FROM hotels WHERE id = ?');
    const hotel = getHotel.get(id);
    
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    
    if (hotel.available_rooms <= 0) {
      return res.status(400).json({ error: 'No rooms available' });
    }
    
    const updateHotel = db.prepare('UPDATE hotels SET available_rooms = available_rooms - 1 WHERE id = ?');
    updateHotel.run(id);
    
    const updatedHotel = getHotel.get(id);
    const totalCost = hotel.price_per_night * nights;
    
    res.json({
      message: 'Hotel booked successfully',
      hotel: updatedHotel,
      booking: {
        hotel_id: id,
        nights,
        total_cost: totalCost
      }
    });
  } catch (error) {
    console.error('Error booking hotel:', error);
    res.status(500).json({ error: 'Failed to book hotel' });
  }
});

// Restaurants API endpoints
router.get('/restaurants', (req, res) => {
  try {
    const { cuisine, location, min_rating, max_delivery_time } = req.query;
    let query = 'SELECT * FROM restaurants WHERE 1=1';
    const params = [];
    
    if (cuisine) {
      query += ' AND cuisine LIKE ?';
      params.push(`%${cuisine}%`);
    }
    
    if (location) {
      query += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    
    if (min_rating) {
      query += ' AND rating >= ?';
      params.push(parseFloat(min_rating));
    }
    
    if (max_delivery_time) {
      query += ' AND delivery_time <= ?';
      params.push(parseInt(max_delivery_time));
    }
    
    query += ' ORDER BY rating DESC, created_at DESC';
    
    const stmt = db.prepare(query);
    const restaurants = stmt.all(...params);
    res.json(restaurants);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

router.post('/restaurants', (req, res) => {
  try {
    const { 
      name, 
      cuisine, 
      location, 
      rating = 4.0, 
      delivery_time = 30, 
      menu = '', 
      description = '' 
    } = req.body;
    
    if (!name || !cuisine || !location) {
      return res.status(400).json({ error: 'Name, cuisine, and location are required' });
    }
    
    if (rating < 0 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 0 and 5' });
    }
    
    if (delivery_time <= 0) {
      return res.status(400).json({ error: 'Delivery time must be greater than 0' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO restaurants (name, cuisine, location, rating, delivery_time, menu, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(name, cuisine, location, rating, delivery_time, menu, description);
    
    const newRestaurant = {
      id: result.lastInsertRowid,
      name,
      cuisine,
      location,
      rating,
      delivery_time,
      menu,
      description,
      created_at: new Date().toISOString()
    };
    
    res.status(201).json(newRestaurant);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

router.delete('/restaurants/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare('DELETE FROM restaurants WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ error: 'Failed to delete restaurant' });
  }
});

// Order from restaurant
router.post('/restaurants/:id/order', (req, res) => {
  try {
    const { id } = req.params;
    const { items = [], special_instructions = '' } = req.body;
    
    if (!items.length) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    
    const getRestaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?');
    const restaurant = getRestaurant.get(id);
    
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    // Calculate estimated total (simplified)
    const estimatedTotal = items.reduce((sum, item) => {
      return sum + (item.price || 0) * (item.quantity || 1);
    }, 0);
    
    const estimatedDelivery = new Date();
    estimatedDelivery.setMinutes(estimatedDelivery.getMinutes() + restaurant.delivery_time);
    
    res.json({
      message: 'Order placed successfully',
      order: {
        restaurant_id: id,
        restaurant_name: restaurant.name,
        items,
        special_instructions,
        estimated_total: estimatedTotal,
        estimated_delivery: estimatedDelivery.toISOString(),
        status: 'confirmed'
      }
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

export { router as apiRoutes };