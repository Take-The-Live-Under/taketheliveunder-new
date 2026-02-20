"""
WebSocket Connection Manager for Real-time Game Updates

Manages WebSocket connections for the NCAA Basketball Betting Monitor.
Provides real-time updates to connected clients and sends high-priority alerts
for high-confidence betting opportunities.
"""

import logging
from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
import json
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections and broadcasts game updates to clients.

    Features:
    - Maintains list of active WebSocket connections
    - Broadcasts game updates to all connected clients
    - Sends priority alerts for high-confidence opportunities
    - Handles disconnections gracefully
    - Provides connection statistics
    """

    def __init__(self):
        """Initialize the connection manager with an empty connections list."""
        self.active_connections: List[WebSocket] = []
        self.connection_count = 0  # Total connections since startup
        logger.info("WebSocket ConnectionManager initialized")

    async def connect(self, websocket: WebSocket) -> None:
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: The WebSocket connection to register
        """
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            self.connection_count += 1

            logger.info(
                f"New WebSocket connection established. "
                f"Active: {len(self.active_connections)}, "
                f"Total: {self.connection_count}"
            )

            # Send welcome message with connection info
            await self.send_personal_message(
                {
                    "type": "connection_established",
                    "message": "Connected to NCAA Betting Monitor",
                    "timestamp": datetime.now().isoformat(),
                    "active_connections": len(self.active_connections)
                },
                websocket
            )

        except Exception as e:
            logger.error(f"Error accepting WebSocket connection: {e}")
            raise

    def disconnect(self, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection from the active connections list.

        Args:
            websocket: The WebSocket connection to remove
        """
        try:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
                logger.info(
                    f"WebSocket connection closed. "
                    f"Active connections: {len(self.active_connections)}"
                )
            else:
                logger.warning("Attempted to disconnect a non-existent connection")

        except Exception as e:
            logger.error(f"Error disconnecting WebSocket: {e}")

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket) -> None:
        """
        Send a message to a specific WebSocket connection.

        Args:
            message: Dictionary containing the message data
            websocket: The target WebSocket connection
        """
        try:
            await websocket.send_json(message)
            logger.debug(f"Sent personal message: {message.get('type', 'unknown')}")

        except WebSocketDisconnect:
            logger.warning("Client disconnected while sending personal message")
            self.disconnect(websocket)

        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """
        Broadcast a message to all connected WebSocket clients.

        Args:
            message: Dictionary containing the message data
        """
        disconnected_clients = []

        for connection in self.active_connections:
            try:
                await connection.send_json(message)

            except WebSocketDisconnect:
                logger.warning("Client disconnected during broadcast")
                disconnected_clients.append(connection)

            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected_clients.append(connection)

        # Clean up disconnected clients
        for connection in disconnected_clients:
            self.disconnect(connection)

        if disconnected_clients:
            logger.info(f"Removed {len(disconnected_clients)} disconnected clients")

    async def broadcast_game_update(self, game_data: Dict[str, Any]) -> None:
        """
        Broadcast game update to all connected clients.

        Formats the game data with timestamp and update type before broadcasting.

        Args:
            game_data: Dictionary containing game information
        """
        try:
            message = {
                "type": "game_update",
                "timestamp": datetime.now().isoformat(),
                "data": game_data
            }

            await self.broadcast(message)

            logger.debug(
                f"Broadcast game update for {game_data.get('game_id', 'unknown')} "
                f"to {len(self.active_connections)} clients"
            )

        except Exception as e:
            logger.error(f"Error broadcasting game update: {e}")

    async def broadcast_all_games(self, games: List[Dict[str, Any]]) -> None:
        """
        Broadcast complete game list to all connected clients.

        Used for periodic full updates or when clients first connect.

        Args:
            games: List of game dictionaries
        """
        try:
            message = {
                "type": "games_update",
                "timestamp": datetime.now().isoformat(),
                "count": len(games),
                "data": games
            }

            await self.broadcast(message)

            logger.debug(f"Broadcast {len(games)} games to {len(self.active_connections)} clients")

        except Exception as e:
            logger.error(f"Error broadcasting all games: {e}")

    async def send_alert(
        self,
        game_data: Dict[str, Any],
        confidence: float,
        alert_type: str = "high_confidence"
    ) -> None:
        """
        Send high-priority alert for high-confidence betting opportunities.

        Alerts are sent when confidence >= 75, indicating strong betting opportunities.

        Args:
            game_data: Dictionary containing game information
            confidence: Confidence score (0-100)
            alert_type: Type of alert (e.g., 'high_confidence', 'max_confidence')
        """
        try:
            # Determine alert level based on confidence
            if confidence >= 86:
                alert_level = "MAX"
                priority = "critical"
            elif confidence >= 76:
                alert_level = "HIGH"
                priority = "high"
            else:
                alert_level = "MEDIUM"
                priority = "medium"

            message = {
                "type": "alert",
                "alert_type": alert_type,
                "alert_level": alert_level,
                "priority": priority,
                "timestamp": datetime.now().isoformat(),
                "confidence": confidence,
                "data": game_data,
                "message": (
                    f"{alert_level} confidence opportunity: "
                    f"{game_data.get('away_team', 'Unknown')} @ {game_data.get('home_team', 'Unknown')} - "
                    f"{game_data.get('bet_type', 'UNDER').upper()} at {confidence:.0f}% confidence"
                )
            }

            await self.broadcast(message)

            logger.info(
                f"Sent {alert_level} alert for game {game_data.get('game_id', 'unknown')} "
                f"(Confidence: {confidence:.0f}%) to {len(self.active_connections)} clients"
            )

        except Exception as e:
            logger.error(f"Error sending alert: {e}")

    async def send_trigger_alert(self, game_data: Dict[str, Any]) -> None:
        """
        Send alert when a game triggers (PPM threshold exceeded).

        Args:
            game_data: Dictionary containing triggered game information
        """
        try:
            confidence = float(game_data.get('confidence_score', 0))
            required_ppm = float(game_data.get('required_ppm', 0))

            message = {
                "type": "alert",
                "alert_type": "trigger",
                "priority": "high" if confidence >= 75 else "medium",
                "timestamp": datetime.now().isoformat(),
                "data": game_data,
                "message": (
                    f"TRIGGER: {game_data.get('away_team', 'Unknown')} @ "
                    f"{game_data.get('home_team', 'Unknown')} - "
                    f"Required PPM: {required_ppm:.2f}"
                )
            }

            await self.broadcast(message)

            logger.info(
                f"Sent trigger alert for game {game_data.get('game_id', 'unknown')} "
                f"(PPM: {required_ppm:.2f})"
            )

        except Exception as e:
            logger.error(f"Error sending trigger alert: {e}")

    async def send_performance_update(self, performance_data: Dict[str, Any]) -> None:
        """
        Broadcast performance statistics update.

        Args:
            performance_data: Dictionary containing performance metrics
        """
        try:
            message = {
                "type": "performance_update",
                "timestamp": datetime.now().isoformat(),
                "data": performance_data
            }

            await self.broadcast(message)

            logger.debug(f"Broadcast performance update to {len(self.active_connections)} clients")

        except Exception as e:
            logger.error(f"Error sending performance update: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """
        Get connection statistics.

        Returns:
            Dictionary containing connection statistics
        """
        return {
            "active_connections": len(self.active_connections),
            "total_connections": self.connection_count,
            "timestamp": datetime.now().isoformat()
        }

    async def ping_all(self) -> None:
        """
        Send ping to all connected clients to keep connections alive.

        Can be called periodically to prevent timeout disconnections.
        """
        try:
            message = {
                "type": "ping",
                "timestamp": datetime.now().isoformat()
            }

            await self.broadcast(message)

            logger.debug(f"Sent ping to {len(self.active_connections)} clients")

        except Exception as e:
            logger.error(f"Error sending ping: {e}")


# Global connection manager instance
# Import this in main.py to use across the application
manager = ConnectionManager()
