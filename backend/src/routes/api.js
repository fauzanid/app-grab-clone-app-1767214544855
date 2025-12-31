import { Router } from 'express';
import { db } from '../db.js';

export const apiRoutes = Router();

// Users routes
apiRoutes.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

apiRoutes.post('/users', (req, res) => {
  const { email, name } = req.body;
  try {
    const result = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)').run(email, name);
    res.status(201).json({ id: result.lastInsertRowid, email, name });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Items routes (legacy)
apiRoutes.get('/items', (req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  res.json(items);
});

apiRoutes.post('/items', (req, res) => {
  const { title, description, user_id } = req.body;
  const result = db.prepare('INSERT INTO items (title, description, user_id) VALUES (?, ?, ?)').run(title, description, user_id);
  res.status(201).json({ id: result.lastInsertRowid, title, description, user_id });
});

apiRoutes.delete('/items/:id', (req, res) => {
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Rides routes
apiRoutes.get('/rides', (req, res) => {
  try {
    const rides = db.prepare(`
      SELECT r.*, d.name as driver_name 
      FROM rides r 
      LEFT JOIN drivers d ON r.driver_id = d.id 
      ORDER BY r.created_at DESC
    `).all();
    res.json(rides);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRoutes.post('/rides', (req, res) => {
  const { pickup, destination, status = 'pending' } = req.body;
  
  if (!pickup || !destination) {
    return res.status(400).json({ error: 'Pickup and destination are required' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO rides (pickup, destination, status) 
      VALUES (?, ?, ?)
    `).run(pickup, destination, status);
    
    const newRide = db.prepare('SELECT * FROM rides WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newRide);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRoutes.post('/rides/:id/accept', (req, res) => {
  const { id } = req.params;
  const { driver_id } = req.body;
  
  if (!driver_id) {
    return res.status(400).json({ error: 'Driver ID is required' });
  }
  
  try {
    db.prepare(`
      UPDATE rides 
      SET driver_id = ?, status = 'accepted' 
      WHERE id = ? AND status = 'pending'
    `).run(driver_id, id);
    
    const updatedRide = db.prepare(`
      SELECT r.*, d.name as driver_name 
      FROM rides r 
      LEFT JOIN drivers d ON r.driver_id = d.id 
      WHERE r.id = ?
    `).get(id);
    
    if (!updatedRide) {
      return res.status(404).json({ error: 'Ride not found or already accepted' });
    }
    
    res.json(updatedRide);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRoutes.post('/rides/:id/complete', (req, res) => {
  const { id } = req.params;
  
  try {
    db.prepare(`
      UPDATE rides 
      SET status = 'completed' 
      WHERE id = ?
    `).run(id);
    
    const updatedRide = db.prepare(`
      SELECT r.*, d.name as driver_name 
      FROM rides r 
      LEFT JOIN drivers d ON r.driver_id = d.id 
      WHERE r.id = ?
    `).get(id);
    
    if (!updatedRide) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    res.json(updatedRide);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Drivers routes
apiRoutes.get('/drivers', (req, res) => {
  try {
    const drivers = db.prepare('SELECT * FROM drivers ORDER BY created_at DESC').all();
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRoutes.post('/drivers', (req, res) => {
  const { name, status = 'available' } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Driver name is required' });
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO drivers (name, status) 
      VALUES (?, ?)
    `).run(name, status);
    
    const newDriver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newDriver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRoutes.put('/drivers/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    db.prepare('UPDATE drivers SET status = ? WHERE id = ?').run(status, id);
    const updatedDriver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id);
    
    if (!updatedDriver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    res.json(updatedDriver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});