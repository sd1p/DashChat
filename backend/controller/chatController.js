const asyncHandler = require("express-async-handler");
const { mongoose } = require("mongoose");
const User = require("../model/userModel");
const Chat = require("../model/chatModel");
const Message = require("../model/messageModel");

exports.createChat = asyncHandler(async (req, res) => {
  const user1 = req.user._id;
  const user2 = new mongoose.Types.ObjectId(req.body.userId);

  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: user1 } } },
      { users: { $elemMatch: { $eq: user2 } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name photo email",
  });
  if (isChat.length > 0) {
    res.status(200).json(isChat[0]);
  } else {
    const users = [user1, user2];
    let lastSeen = {};
    users.forEach((user) => (lastSeen[user.toString()] = null));
    let chatData = {
      chatName: "SingleChat",
      isGroupChat: false,
      users,
      lastSeen,
    };
    try {
      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findById(createdChat._id).populate(
        "users",
        "-password"
      );
      res.status(201).json(fullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

exports.getAllChats = asyncHandler(async (req, res) => {
  try {
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ "latestMessage.createdAt": -1 })
      .lean()
      .then(async (result) => {
        result = await User.populate(result, {
          path: "latestMessage.sender",
          select: "name photo email",
        });
        return result;
      });

    for (const chat of chats) {
      const lastSeen = chat.lastSeen[req.user._id];
      const chatId = chat._id;
      const notification = await Message.find({
        chat: chatId,
        createdAt: { $gte: lastSeen },
      }).count();

      chat.notification = notification;
    }

    chats.sort((a, b) => {
      const latestMessageA = a.latestMessage;
      const latestMessageB = b.latestMessage;

      if (latestMessageA && latestMessageB) {
        return latestMessageB.createdAt - latestMessageA.createdAt;
      } else if (latestMessageA) {
        return -1;
      } else if (latestMessageB) {
        return 1;
      } else {
        return 0;
      }
    });
    res.status(200).json(chats);
  } catch (error) {
    console.log(error);
    res.status(400);
    throw new Error(error.message);
  }
});

exports.createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.name || !req.body.users) {
    return res.status(400).json({ message: "Please fill all the fields" });
  }

  // if (users.length < 2) {
  //   return res
  //     .status(400)
  //     .json({ message: "More than 2 users required for group chat" });
  // }

  let lastSeen = {};
  const users = req.body.users.map((id) => {
    if (mongoose.Types.ObjectId.isValid(id)) {
      lastSeen[id] = null;
      return new mongoose.Types.ObjectId(id);
    } else {
      return res.status(400).json({ message: "Invalid User IDs" });
    }
  });
  console.log(lastSeen);
  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
      lastSeen,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(201).json(fullGroupChat);
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
});

exports.renameGroup = asyncHandler(async (req, res) => {
  const { groupId, groupName } = req.body;
  const group = await Chat.findById(groupId).populate(
    "groupAdmin",
    "-password"
  );

  if (!group) {
    return res.status(400).json({ message: "Group not found" });
  }
  if (group.groupAdmin._id.toString() !== req.user._id.toString()) {
    return res
      .status(400)
      .json({ message: "Name can only be changed by Admin" });
  }

  const groupChat = await Chat.findByIdAndUpdate(
    groupId,
    {
      chatName: groupName,
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!groupChat) {
    res.status(400);
    throw new Error("Chat Not Found");
  } else {
    res.json(groupChat);
  }
});

exports.removeMember = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.body;
  const group = await Chat.findById(groupId).populate(
    "groupAdmin",
    "-password"
  );

  if (!group) {
    return res.status(400).json({ message: "Group not found" });
  }
  if (group.groupAdmin._id.toString() !== req.user._id.toString()) {
    return res
      .status(400)
      .json({ message: "Only Admins can remove participants" });
  }

  const groupChat = await Chat.findByIdAndUpdate(
    groupId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!groupChat) {
    res.status(400);
    throw new Error("Chat Not Found");
  } else {
    res.json(groupChat);
  }
});

exports.addMember = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.body;
  const group = await Chat.findById(groupId).populate(
    "groupAdmin",
    "-password"
  );

  if (!group) {
    return res.status(400).json({ message: "Group not found" });
  }
  if (group.groupAdmin._id.toString() !== req.user._id.toString()) {
    return res
      .status(400)
      .json({ message: "Only Admins can add participants" });
  }

  if (group.users.includes(new mongoose.Types.ObjectId(userId))) {
    return res.status(200).json({ message: "User already added." });
  }
  const groupChat = await Chat.findByIdAndUpdate(
    groupId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!groupChat) {
    res.status(400);
    throw new Error("Chat Not Found");
  } else {
    res.json(groupChat);
  }
});

exports.getChatDetails = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (chatId !== null && !mongoose.isValidObjectId(chatId)) {
    console.log(chatId);
    res.status(400).json({ message: "Invalid Chat ID" });
  }
  try {
    const chat = await Chat.findById(chatId)
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (result) => {
        result = await User.populate(result, {
          path: "latestMessage.sender",
          select: "name photo email",
        });
        return result;
      });
    res.status(200).json(chat);
  } catch (error) {
    console.log(error);
    res.status(400);
    throw new Error(error.message);
  }
});
