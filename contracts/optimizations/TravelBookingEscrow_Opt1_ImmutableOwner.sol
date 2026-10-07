// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Optimization 1: owner -> immutable (set once in constructor, never reassigned).
contract TravelBookingEscrow_Step1_ImmutableOwner {
    address public immutable owner; // <-- changed

    uint256 public bookingCount;

    enum BookingStatus { Pending, Completed, Cancelled }

    struct Booking {
        uint256 id;
        address traveler;
        address provider;
        uint256 amount;
        BookingStatus status;
        uint256 createdAt;
    }

    mapping(uint256 => Booking) public bookings;

    event BookingCreated(
        uint256 indexed bookingId,
        address indexed traveler,
        address indexed provider,
        uint256 amount
    );
    event BookingCompleted(uint256 indexed bookingId, address indexed provider, uint256 amount);
    event BookingCancelled(uint256 indexed bookingId, address indexed traveler, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function createBooking(address provider) external payable {
        require(msg.value > 0, "Deposit must be greater than 0");
        require(provider != address(0), "Invalid provider address");
        require(provider != msg.sender, "Cannot book with yourself");

        bookingCount++;
        bookings[bookingCount] = Booking({
            id: bookingCount,
            traveler: msg.sender,
            provider: provider,
            amount: msg.value,
            status: BookingStatus.Pending,
            createdAt: block.timestamp
        });

        emit BookingCreated(bookingCount, msg.sender, provider, msg.value);
    }

    function confirmCompletion(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.id != 0, "Booking does not exist");
        require(booking.status == BookingStatus.Pending, "Booking is not pending");
        require(msg.sender == booking.traveler, "Only the traveler can confirm completion");

        booking.status = BookingStatus.Completed;
        payable(booking.provider).transfer(booking.amount);

        emit BookingCompleted(bookingId, booking.provider, booking.amount);
    }

    function cancelBooking(uint256 bookingId) external {
        Booking storage booking = bookings[bookingId];
        require(booking.id != 0, "Booking does not exist");
        require(booking.status == BookingStatus.Pending, "Booking is not pending");
        require(
            msg.sender == booking.traveler || msg.sender == owner,
            "Only traveler or owner can cancel"
        );

        booking.status = BookingStatus.Cancelled;
        payable(booking.traveler).transfer(booking.amount);

        emit BookingCancelled(bookingId, booking.traveler, booking.amount);
    }

    function getBookingDetails(uint256 bookingId)
        external
        view
        returns (Booking memory)
    {
        require(bookings[bookingId].id != 0, "Booking does not exist");
        return bookings[bookingId];
    }

    function getBookingCount() external view returns (uint256) {
        return bookingCount;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
